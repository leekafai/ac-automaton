import ByteBuffer from "bytebuffer";
import fs from "fs-extra";
import _ from 'lodash';

const ROOT_INDEX = 1;

const initAC = () => ({
  base: [],
  check: [],
  failurelink: [],
  output: [],
  codemap: [],
});

const calcBase = (da: { base: number[], check: number[], failurelink: number[], output: number[], codemap: number[] }, index: number, children: any[]) => {
  let base = 1;
  if (index - children[0].code > base) {
    base = (index - children[0].code) + 1;
  }
  for (; ;) {
    let used = false;
    for (let i = 0; i < children.length; i++) {
      const nextState = base + children[i].code;
      if (da.check[nextState]) {
        used = true;
        break;
      }
    }
    if (used) {
      base += 1;
    } else {
      break;
    }
  }
  return base;
};

const searchChildren = (state: { children: any; pattern?: boolean; }, code: number) => state.children.filter((s: { code: number; }) => s.code === code)[0];

const isRoot = (baseTrie: { code: number; }) => !baseTrie.code;
type trieChild = {
  code?: number, children: trieChild[], pattern?: boolean
}
type trieTree = {
  children: trieChild[]
}
const buildBaseTrie = (sortedKeys: Buffer[]): trieTree => {
  const root: trieTree = { children: [] };
  _.forEach(sortedKeys, (codes) => {
    let current: trieTree | trieChild = root;
    _.forEach(codes, (code, i) => {
      const found = searchChildren(current, code);
      if (found) {
        current = found;
      } else {
        const state = { code, children: [] };
        current.children.push(state as never);
        current = state;
      }
      if (~~i === codes.length - 1) {
        (current as trieChild).pattern = true;
      }
    });
  });
  return root;
};

// DFS
const buildDoubleArray = (rootIndex: number,
  baseTrie: trieTree,
  doubleArray: { base: number[], check: number[], failurelink: number[], output: number[], codemap: number[] }) => {
  const stack = [{ state: baseTrie, index: rootIndex }];

  while (!_.isEmpty(stack)) {
    const c = stack.pop()
    if (c) {
      const { state, index } = c;
      (state as any).index = index;

      if ((state as any).code) {
        doubleArray.codemap[index] = (state as any).code;
      }
      if (!_.isEmpty(state.children)) {
        const v = calcBase(doubleArray, index, state.children);
        if ((state as any).pattern) {
          doubleArray.base[index] = -v;
        } else {
          doubleArray.base[index] = v;
        }
        // set check
        _.forEach(state.children, (child) => {
          const nextState = v + (child as any).code;

          doubleArray.check[nextState] = index;
          stack.push({ state: child, index: nextState });
        });
      }
    }

  }
};


const findFailureLink = (currentState: { failurelink: any; }, code: number): any => {
  const link = currentState.failurelink;
  const index = _.findIndex(link.children, (child: any) => child.code === code);
  if (index >= 0) {
    return link.children[index];
  }
  if (isRoot(link)) {
    return link;
  }
  return findFailureLink(link, code);
};

// BFS
const buildAC = (baseTrie: { children: any[]; pattern?: boolean; index?: number; }, ac: {
  base: number[];
  check: number[];
  failurelink: number[];
  output: number[];
  codemap: number[];
}) => {
  const queue: any[] = [];
  _.forEach(baseTrie.children, (child) => {
    child.failurelink = baseTrie;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ac.failurelink[child.index] = ~~(baseTrie.index!);
    queue.push(child as never);
  });
  let i = 0;
  while (i < queue.length) {
    const current: any = queue[i];
    if (!current?.children) {
      current.children = []
    }
    i += 1;
    _.forEach(current.children, (child) => {
      // build failurelink
      const failurelink = findFailureLink(current, child.code);
      child.failurelink = failurelink;
      ac.failurelink[child.index] = failurelink.index;
      queue.push(child as never);

      // build output link
      if (failurelink.pattern) {
        child.output = failurelink;
      } else {
        child.output = failurelink.output;
      }
      if (child.output) {
        ac.output[child.index] = child.output.index;
      }
    });
  }
};

const getBase = (ac: DictObject, index: number): number => {
  const v = ~~(ac.base?.[index]);
  if (v < 0) {
    return -v;
  }
  return v;
};

const getNextIndexByFalure = (ac: DictObject, currentIndex: number, code: number): number => {
  let failure = ~~(ac.failurelink[currentIndex]);
  if (!failure || !getBase(ac, failure)) {
    failure = ROOT_INDEX;
  }
  const failureNext = getBase(ac, failure) + code;
  if (failureNext && ~~(ac.check[failureNext]) === failure) {
    return failureNext;
  }
  if (currentIndex === ROOT_INDEX) {
    return ROOT_INDEX;
  }
  return getNextIndexByFalure(ac, failure, code);
};

const getNextIndex = (ac: DictObject, currentIndex: number, code: number) => {
  const nextIndex = getBase(ac, currentIndex) + code;
  if (nextIndex && ~~(ac.check[nextIndex]) === currentIndex) {
    return nextIndex;
  }
  return getNextIndexByFalure(ac, currentIndex, code);
};

const getPattern = (ac: DictObject, index: number): number[] => {
  if (index <= ROOT_INDEX) {
    return [];
  }
  const code = ac.codemap?.[index];
  const parent = ac.check?.[index];

  const res = getPattern(ac, ~~(parent));
  res.push(~~code);
  return res;
};

const getOutputs = (ac: DictObject, index: number): number[][] => {
  const output = ac.output[index];
  if (output) {
    return [getPattern(ac, ~~output)].concat(getOutputs(ac, ~~output));
  }
  return [];
};

const convert = (codes: Iterable<number>): string => {
  const arr = Int8Array.from(codes);
  return ByteBuffer.wrap(arr.buffer).buffer.toString('utf-8')
};

const search = (ac: DictObject, text: string) => {
  const result: string[] = [];
  const codes = ByteBuffer.fromUTF8(text).buffer;
  let currentIndex = ROOT_INDEX;
  _.forEach(codes, (code) => {
    const nextIndex = getNextIndex(ac, currentIndex, code);
    if (~~(ac.base[nextIndex]) < 0 || !ac.base[nextIndex]) {
      result.push(convert(getPattern(ac, nextIndex)) as never);
    }
    const outputs = getOutputs(ac, nextIndex);
    _.forEach(outputs, (output) => {
      result.push(convert(output) as never);
    });
    currentIndex = nextIndex;
  });
  return _.uniq(result).sort();
};

const searchLimit = (ac: DictObject, text: string, limit: number | undefined = undefined) => {
  const result: string[] = [];
  const codes = ByteBuffer.fromUTF8(text).buffer;
  let currentIndex = ROOT_INDEX;
  for (const code of codes) {
    const nextIndex = getNextIndex(ac, currentIndex, code);
    if (~~(ac.base[nextIndex]) < 0 || !ac.base[nextIndex]) {
      const l = result.push(convert(getPattern(ac, nextIndex)) as never);
      if (l === limit) {
        break
      }
    }

    const outputs = getOutputs(ac, nextIndex);
    for (const output of outputs) {
      const l = result.push(convert(output) as never);
      if (l === limit) {
        break
      }
    }
    currentIndex = nextIndex;
  }
  return _.uniq(result).sort();
};

const Test = (ac: DictObject, text: string) => {
  let result = false;
  const codes = ByteBuffer.fromUTF8(text).buffer;
  let currentIndex = ROOT_INDEX;
  for (const code of codes) {
    const nextIndex = getNextIndex(ac, currentIndex, code);
    if (~~(ac.base[nextIndex]) < 0 || !ac.base[nextIndex]) {
      result = getPattern(ac, nextIndex).length > 0
      if (result) {
        break
      }
    }

    const outputs = getOutputs(ac, nextIndex);
    for (const output of outputs) {
      result = output.length > 0
      if (result) {
        break
      }
    }
    currentIndex = nextIndex;
  }
  return result
};
const arrayToInt32Array = (arr: number[]) => {
  const int32Array = new Int32Array(arr.length);
  _.forEach(arr, (v, i) => {
    int32Array[i] = ~~v;
  });
  return int32Array;
};

const int32ArrayToHex = (int32Array: { buffer: string | ByteBuffer | ArrayBuffer | Buffer | Uint8Array; }) => {
  const b = ByteBuffer.wrap(int32Array.buffer);
  return b.buffer.toString('hex');
}

const hexToInt32Array = (hex: string) => {
  const b = ByteBuffer.fromHex(hex);
  return new Int32Array(b.toArrayBuffer());
};

const compactAC = (ac: {
  base: number[];
  check: number[];
  failurelink: number[];
  output: number[];
  codemap: number[];
}) => ({
  base: arrayToInt32Array(ac.base),
  check: arrayToInt32Array(ac.check),
  failurelink: arrayToInt32Array(ac.failurelink),
  output: arrayToInt32Array(ac.output),
  codemap: arrayToInt32Array(ac.codemap),
});

const exportAC = (ac: DictObject) => ({
  base: int32ArrayToHex(ac.base),
  check: int32ArrayToHex(ac.check),
  failurelink: int32ArrayToHex(ac.failurelink),
  output: int32ArrayToHex(ac.output),
  codemap: int32ArrayToHex(ac.codemap),
});

const importAC = (dict: DictJson) => {
  const {
    base,
    check,
    failurelink,
    output,
    codemap,
  } = dict
  const result = {
    base: hexToInt32Array(base),
    check: hexToInt32Array(check),
    failurelink: hexToInt32Array(failurelink),
    output: hexToInt32Array(output),
    codemap: hexToInt32Array(codemap),
  }
  return result
}

class Builder {
  private words: string[]
  constructor() {
    this.words = [];
  }

  add(word: string) {
    this.words.push(word);
  }

  build() {
    const keys = this.words.map(k => ByteBuffer.fromUTF8(k).buffer).sort();
    const baseTrie = buildBaseTrie(keys);
    const ac = initAC();
    buildDoubleArray(ROOT_INDEX, baseTrie, ac);
    buildAC(baseTrie, ac);
    return new AhoCorasick(compactAC(ac));
  }
}


export type DictObject = {
  base: Int32Array, check: Int32Array, failurelink: Int32Array, output: Int32Array, codemap: Int32Array
}
export type DictJson = {
  base: string, check: string, failurelink: string, output: string, codemap: string
}
class AhoCorasick {
  private data
  constructor(data?: DictObject) {
    this.data = data;
  }
  test(text: string) {
    if (!this.data) return false
    return Test(this.data, text)
    // return searchLimit(this.data, text, 1)

  }
  match(text: string) {
    if (!this.data) return []
    return search(this.data, text);
  }
  matchLimit(text: string, limit: number | undefined = undefined) {
    if (!this.data) return []
    return searchLimit(this.data, text, limit)
  }
  export() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (this.data) {
      return exportAC(this.data || initAC());
    }
  }

  static from(dict: DictJson) {
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ac = new AhoCorasick();
    ac.data = importAC(dict);
    return ac;
  }

  static builder() {
    return new Builder();
  }
}
type DictToolOptions = {
  debug: false
}
type DictToolDictObject = {
  base: string, output: string, check: string, failurelink: string, codemap: string
}
/**
 * AC 自动机
 * 将词典文件导入到 AC 自动机进行关键词匹配
 */
class DictTool {
  private keywordsSet: Set<string> = new Set()
  private dictObject: DictToolDictObject | undefined = undefined
  private _ac: AhoCorasick | undefined
  private _opts: DictToolOptions | undefined = undefined
  constructor(opts?: DictToolOptions) {
    this._opts = opts
  }
  /**
   * 新增关键词至词典
   * @param keywords 关键词
   */
  Add(keywords: string[]) {
    const orSize = this.keywordsSet.size
    const filtered = keywords.filter((kw) => {
      return typeof kw == 'string'
    })
    if (!filtered.length) return this
    filtered.forEach((kw) => {
      this.keywordsSet.add(kw)
    })
    if (orSize !== this.keywordsSet.size) {
      // 自动重建词典
      this._BuildFromKeyword()
    }
    return this
  }
  /**
   * 删除词典中的关键词
   * @param keywords 
   */
  Delete(keywords: string[]) {
    const orSize = this.keywordsSet.size
    const filtered = keywords.filter((kw) => {
      return typeof kw == 'string'
    })
    if (!filtered.length) return this
    filtered.forEach((kw) => {
      this.keywordsSet.delete(kw)
    })
    if (orSize !== this.keywordsSet.size) {
      // 自动重建词典
      this._BuildFromKeyword()
    }
    return this
  }
  /**
   * 从关键词构建ac自动机
   */
  private _BuildFromKeyword() {
    const builder = new Builder()

    for (const kw of this.keywordsSet) {
      builder.add(kw)
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.Import(builder.build().export()!)

  }
  /**
   * 导出词典数据
   * @returns 
   */
  Export() {

    this.dictObject = this._ac?.export()

    return this.dictObject
  }
  /**
   * 匹配词
   * @param input 
   * @param limit 
   * @returns 
   */
  Match(input: string, limit?: number): string[] {
    if (!this.dictObject || !this._ac) {
      return []
    }
    const match = this._ac?.matchLimit(input, limit)
    return match || []
  }
  /**
   * 检查是否包含任意词
   * @param input 
   * @returns 
   */
  Test(input: string) {

    if (!this._ac) {
      return false
    }
    return this._ac.test(input)
    return Boolean(this._ac?.matchLimit(input, 1)[0])

  }
  /**
   * 导入词典Object，构建AC自动机
   * @param dictObject 
   */
  Import(
    dictObject: { base: string, output: string, check: string, failurelink: string, codemap: string }
  ) {
    this.dictObject = dictObject
    this._ac = AhoCorasick.from(dictObject)
    return this
  }
  get avaliable() {
    if (this._ac) {
      return true
    }
  }
  /**
   * 将词典输出到文件
   * @param file 
   * @returns 
   */
  ToFile(file: string) {
    return fs.writeJSONSync(file, this._ac?.export())
  }
  /**
   * 从文件中导入词典
   * @param file 
   */
  FromFile(file: string) {
    const dictJson = fs.readJSONSync(file)
    return this.Import(dictJson)
  }
}
export default DictTool