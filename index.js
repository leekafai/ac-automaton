"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bytebuffer_1 = __importDefault(require("bytebuffer"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const ROOT_INDEX = 1;
const initAC = () => ({
    base: [],
    check: [],
    failurelink: [],
    output: [],
    codemap: [],
});
const calcBase = (da, index, children) => {
    let base = 1;
    if (index - children[0].code > base) {
        base = (index - children[0].code) + 1;
    }
    for (;;) {
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
        }
        else {
            break;
        }
    }
    return base;
};
const searchChildren = (state, code) => state.children.filter((s) => s.code === code)[0];
const isRoot = (baseTrie) => !baseTrie.code;
const buildBaseTrie = (sortedKeys) => {
    const root = { children: [] };
    lodash_1.default.forEach(sortedKeys, (codes) => {
        let current = root;
        lodash_1.default.forEach(codes, (code, i) => {
            const found = searchChildren(current, code);
            if (found) {
                current = found;
            }
            else {
                const state = { code, children: [] };
                current.children.push(state);
                current = state;
            }
            if (~~i === codes.length - 1) {
                current.pattern = true;
            }
        });
    });
    return root;
};
// DFS
const buildDoubleArray = (rootIndex, baseTrie, doubleArray) => {
    const stack = [{ state: baseTrie, index: rootIndex }];
    while (!lodash_1.default.isEmpty(stack)) {
        // console.log(doubleArray, 'doubleArray')
        const c = stack.pop();
        if (c) {
            const { state, index } = c;
            state.index = index;
            if (state.code) {
                doubleArray.codemap[index] = state.code;
            }
            if (!lodash_1.default.isEmpty(state.children)) {
                const v = calcBase(doubleArray, index, state.children);
                if (state.pattern) {
                    doubleArray.base[index] = -v;
                }
                else {
                    doubleArray.base[index] = v;
                }
                // set check
                lodash_1.default.forEach(state.children, (child) => {
                    const nextState = v + child.code;
                    doubleArray.check[nextState] = index;
                    stack.push({ state: child, index: nextState });
                });
            }
        }
    }
};
const findFailureLink = (currentState, code) => {
    const link = currentState.failurelink;
    const index = lodash_1.default.findIndex(link.children, (child) => child.code === code);
    if (index >= 0) {
        return link.children[index];
    }
    if (isRoot(link)) {
        return link;
    }
    return findFailureLink(link, code);
};
// BFS
const buildAC = (baseTrie, ac) => {
    const queue = [];
    lodash_1.default.forEach(baseTrie.children, (child) => {
        child.failurelink = baseTrie;
        ac.failurelink[child.index] = ~~(baseTrie.index);
        queue.push(child);
    });
    let i = 0;
    while (i < queue.length) {
        const current = queue[i];
        if (!(current === null || current === void 0 ? void 0 : current.children)) {
            current.children = [];
        }
        i += 1;
        lodash_1.default.forEach(current.children, (child) => {
            // build failurelink
            const failurelink = findFailureLink(current, child.code);
            child.failurelink = failurelink;
            ac.failurelink[child.index] = failurelink.index;
            queue.push(child);
            // build output link
            if (failurelink.pattern) {
                child.output = failurelink;
            }
            else {
                child.output = failurelink.output;
            }
            if (child.output) {
                ac.output[child.index] = child.output.index;
            }
        });
    }
};
const getBase = (ac, index) => {
    var _a;
    const v = ~~((_a = ac.base) === null || _a === void 0 ? void 0 : _a[index]);
    if (v < 0) {
        return -v;
    }
    return v;
};
const getNextIndexByFalure = (ac, currentIndex, code) => {
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
const getNextIndex = (ac, currentIndex, code) => {
    const nextIndex = getBase(ac, currentIndex) + code;
    if (nextIndex && ~~(ac.check[nextIndex]) === currentIndex) {
        return nextIndex;
    }
    return getNextIndexByFalure(ac, currentIndex, code);
};
const getPattern = (ac, index) => {
    var _a, _b;
    if (index <= ROOT_INDEX) {
        return [];
    }
    const code = (_a = ac.codemap) === null || _a === void 0 ? void 0 : _a[index];
    const parent = (_b = ac.check) === null || _b === void 0 ? void 0 : _b[index];
    const res = getPattern(ac, ~~(parent));
    res.push(~~code);
    return res;
};
const getOutputs = (ac, index) => {
    const output = ac.output[index];
    if (output) {
        return [getPattern(ac, ~~output)].concat(getOutputs(ac, ~~output));
    }
    return [];
};
const convert = (codes) => {
    const arr = Int8Array.from(codes);
    return bytebuffer_1.default.wrap(arr.buffer).buffer.toString('utf-8');
};
const search = (ac, text) => {
    const result = [];
    const codes = bytebuffer_1.default.fromUTF8(text).buffer;
    let currentIndex = ROOT_INDEX;
    lodash_1.default.forEach(codes, (code) => {
        const nextIndex = getNextIndex(ac, currentIndex, code);
        if (~~(ac.base[nextIndex]) < 0 || !ac.base[nextIndex]) {
            result.push(convert(getPattern(ac, nextIndex)));
        }
        const outputs = getOutputs(ac, nextIndex);
        lodash_1.default.forEach(outputs, (output) => {
            result.push(convert(output));
        });
        currentIndex = nextIndex;
    });
    return lodash_1.default.uniq(result).sort();
};
const searchLimit = (ac, text, limit = undefined) => {
    const result = [];
    const codes = bytebuffer_1.default.fromUTF8(text).buffer;
    let currentIndex = ROOT_INDEX;
    for (const code of codes) {
        const nextIndex = getNextIndex(ac, currentIndex, code);
        if (~~(ac.base[nextIndex]) < 0 || !ac.base[nextIndex]) {
            const l = result.push(convert(getPattern(ac, nextIndex)));
            if (l === limit) {
                break;
            }
        }
        const outputs = getOutputs(ac, nextIndex);
        for (const output of outputs) {
            const l = result.push(convert(output));
            if (l === limit) {
                break;
            }
        }
        currentIndex = nextIndex;
    }
    return lodash_1.default.uniq(result).sort();
};
const arrayToInt32Array = (arr) => {
    const int32Array = new Int32Array(arr.length);
    lodash_1.default.forEach(arr, (v, i) => {
        int32Array[i] = ~~v;
    });
    return int32Array;
};
const int32ArrayToHex = (int32Array) => {
    const b = bytebuffer_1.default.wrap(int32Array.buffer);
    return b.buffer.toString('hex');
};
const hexToInt32Array = (hex) => {
    const b = bytebuffer_1.default.fromHex(hex);
    return new Int32Array(b.toArrayBuffer());
};
const compactAC = (ac) => ({
    base: arrayToInt32Array(ac.base),
    check: arrayToInt32Array(ac.check),
    failurelink: arrayToInt32Array(ac.failurelink),
    output: arrayToInt32Array(ac.output),
    codemap: arrayToInt32Array(ac.codemap),
});
const exportAC = (ac) => ({
    base: int32ArrayToHex(ac.base),
    check: int32ArrayToHex(ac.check),
    failurelink: int32ArrayToHex(ac.failurelink),
    output: int32ArrayToHex(ac.output),
    codemap: int32ArrayToHex(ac.codemap),
});
const importAC = (dict) => {
    const { base, check, failurelink, output, codemap, } = dict;
    const result = {
        base: hexToInt32Array(base),
        check: hexToInt32Array(check),
        failurelink: hexToInt32Array(failurelink),
        output: hexToInt32Array(output),
        codemap: hexToInt32Array(codemap),
    };
    return result;
};
class Builder {
    constructor() {
        this.words = [];
    }
    add(word) {
        this.words.push(word);
    }
    build() {
        const keys = this.words.map(k => bytebuffer_1.default.fromUTF8(k).buffer).sort();
        const baseTrie = buildBaseTrie(keys);
        const ac = initAC();
        buildDoubleArray(ROOT_INDEX, baseTrie, ac);
        buildAC(baseTrie, ac);
        return new AhoCorasick(compactAC(ac));
    }
}
class AhoCorasick {
    constructor(data) {
        this.data = data;
    }
    match(text) {
        if (!this.data)
            return [];
        return search(this.data, text);
    }
    matchLimit(text, limit = undefined) {
        if (!this.data)
            return [];
        return searchLimit(this.data, text, limit);
    }
    export() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (this.data) {
            return exportAC(this.data || initAC());
        }
    }
    static from(dict) {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ac = new AhoCorasick();
        ac.data = importAC(dict);
        return ac;
    }
    static builder() {
        return new Builder();
    }
}
/**
 * AC 自动机
 * 将词典文件导入到 AC 自动机进行关键词匹配
 */
class DictTool {
    constructor(opts) {
        this.keywordsSet = new Set();
        this.dictObject = undefined;
        this._opts = undefined;
        this._opts = opts;
    }
    /**
     * 新增关键词至词典
     * @param keywords 关键词
     */
    Add(keywords) {
        const orSize = this.keywordsSet.size;
        const filtered = keywords.filter((kw) => {
            return typeof kw == 'string';
        });
        if (!filtered.length)
            return this;
        filtered.forEach((kw) => {
            this.keywordsSet.add(kw);
        });
        if (orSize !== this.keywordsSet.size) {
            // 自动重建词典
            this._dictBuild();
        }
        return this;
    }
    /**
     * 删除词典中的关键词
     * @param keywords
     */
    Delete(keywords) {
        const orSize = this.keywordsSet.size;
        const filtered = keywords.filter((kw) => {
            return typeof kw == 'string';
        });
        if (!filtered.length)
            return this;
        filtered.forEach((kw) => {
            this.keywordsSet.delete(kw);
        });
        if (orSize !== this.keywordsSet.size) {
            // 自动重建词典
            this._dictBuild();
        }
        return this;
    }
    /**
     * 构建ac自动机
     */
    _dictBuild() {
        const builder = new Builder();
        for (const kw of this.keywordsSet) {
            builder.add(kw);
        }
        this._ac = builder.build();
    }
    /**
     * 导出词典数据
     * @returns
     */
    Export() {
        var _a;
        this.dictObject = (_a = this._ac) === null || _a === void 0 ? void 0 : _a.export();
        return this.dictObject;
    }
    /**
     * 匹配词
     * @param input
     * @param limit
     * @returns
     */
    Match(input, limit) {
        var _a;
        const match = (_a = this._ac) === null || _a === void 0 ? void 0 : _a.matchLimit(input, limit);
        return match || [];
    }
    /**
     * 检查是否包含任意词
     * @param input
     * @returns
     */
    Test(input) {
        var _a;
        return Boolean((_a = this._ac) === null || _a === void 0 ? void 0 : _a.matchLimit(input, 1)[0]);
    }
    /**
     * 导入词典JSON
     * @param dictObject
     */
    Import(dictObject) {
        this.dictObject = dictObject;
        this._ac = AhoCorasick.from(dictObject);
        return this;
    }
    /**
     * 将词典输出到文件
     * @param file
     * @returns
     */
    ToFile(file) {
        var _a;
        return fs_extra_1.default.writeJSONSync(file, (_a = this._ac) === null || _a === void 0 ? void 0 : _a.export());
    }
    /**
     * 从文件中导入词典
     * @param file
     */
    FromFile(file) {
        const dictJson = fs_extra_1.default.readJSONSync(file);
        this._ac = AhoCorasick.from(dictJson);
        return this;
    }
}
exports.default = DictTool;
