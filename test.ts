// import * as AhoCorasick from './ahoco'
// import * as fs from "fs-extra"
// import { DictObject } from './ahoco'
// // const path = require('node:path')
// // const keywords = ['b', 'ba', 'nan', 'ab'];
// // const builder = AhoCorasick.builder();
// // keywords.forEach(k => builder.add(k));
// // const ac = builder.build();
// // const buf = ac.export();
// // const text = 'banana';

// // fs.writeJSONSync(path.join(__dirname, 'ac_dic'), buf)
// // const readBuf = fs.readJSONSync(path.join(__dirname, 'ac_dic'))
// // const loadedAC = AhoCorasick.from(readBuf);
// // const hits = loadedAC.match(text); // ['b', 'ba', 'nan']
// // console.log(hits)
// // console.log(typeof buf);
// /**
//  *
//  */
// class DictTool {
//   private dict: AhoCorasick.DictJson | undefined = undefined
//   private Aho: AhoCorasick.default | undefined = undefined
//   /**
//    *
//    * @param {object|string} dict dict object or filename
//    * @returns {Match}
//    */
//   constructor(dict?: AhoCorasick.DictJson) {
//     if (dict) {
//       this.dict = dict
//       this.Import(dict)
//     }
//   }
//   /**
//    *
//    * @param {object|string} dict dict object or filename
//    * @returns {Match}
//    */
//   Import(dict: AhoCorasick.DictJson | string) {
//     if (typeof dict === 'string') {
//       this.dict = this._ReadDictFile(dict)
//     } else {
//       this.Aho = AhoCorasick.default.from(dict)
//     }
//     // console.log(this.Aho?.export())
//     return this
//   }
//   Test(input: string) {
//     if (!this.Aho) {
//       throw new Error('AhoCorasick is not ready')
//     }
//     // console.log(this.Aho.matchLimit(input, 1).length)
//     return this.Aho.matchLimit(input, 1)?.length > 0

//   }
//   Search(input: string, limit?: number) {
//     if (!this.Aho) {
//       throw new Error('AhoCorasick is not ready')
//     }
//     return this.Aho.matchLimit(input, (limit && limit >= 1) ? limit : undefined)
//   }
//   // HitOnce(input) {
//   //   if (!this.Aho) {
//   //     throw new Error('AhoCorasick is not ready')
//   //   }
//   //   return this.Aho.matchOnce(input)
//   // }
//   Export(fileName: string) {
//     return fs.writeJSONSync(fileName, this.dict)
//   }
//   static Export(fileName: string, dict: DictObject) {
//     return fs.writeJSONSync(fileName, dict)
//   }
//   _ReadDictFile(fileName: string) {
//     const d = fs.readJSONSync(fileName)
//     return d
//   }
//   static Build(keywords: string[] = []) {
//     if (!Array.isArray(keywords)) {
//       throw new Error('keywords must be Array')
//     }
//     const builder = AhoCorasick.default.builder();
//     keywords.forEach(k => builder.add(k));
//     // console.log(builder.build().export(), '>>>')
//     return builder.build().export()
//   }
// }

// const builder = AhoCorasick.default.builder();
// const input = '我得甲亢，吃西药已九个多月了。听说贵院一种中药，吃一颗就可以制好。我的病是典型甲亢。我的病可以吃这种药吗？1'
// const keywords = ['甲亢', '贵院', '哪种药', '这种'];
// // const keywords = ['1', '12', '2']
// keywords.forEach(k => builder.add(k));
// const dict = DictTool.Build(keywords);
// console.log(dict, 'dict')
// const dt = new DictTool()
// dt.Import(dict!)
// console.log(dt.Search(input))
// // console.log(dt.Test(input))
// // const dt = new DictTool(dict)
// // console.log(dt.Search(input))
// // console.log(dt.Test(input))
// // const dict2 = DictTool.Build(['中药']);

// // replace
// // dt.Import(dict2)
// // console.log(dt.Search(input))
// // console.log(dt.Test(input))

// // dt.Export('test.json')
// // dt.Import('test.json')
// // console.log(dt.Search(input))
// // console.log(dt.Te

// // module.exports = DictTool
// console.log('hello')
import path from 'node:path'
import DictTool from ".";
const dict = new DictTool()
dict.Add(['1', '2', '3', '甲亢'])
for (let i = 0; i < 1e4; i++) {
  dict.Match('我得甲亢，吃西药已九个多月了。听说贵院一种中药，吃一颗就可以制好。我的病是典型甲亢。我的病可以吃这种药吗？1', 1)
  dict.Test('我得甲亢，吃西药已九个多月了。听说贵院一种中药，吃一颗就可以制好。我的病是典型甲亢。我的病可以吃这种药吗？1')
}



console.time('Test')

for (let i = 0; i < 5e4; i++) {
  dict.Test('我得甲亢，吃西药已九个多月了。听说贵院一种中药，吃一颗就可以制好。我的病是典型甲亢。我的病可以吃这种药吗？1')
}
console.timeEnd('Test')

console.time('Match1')

for (let i = 0; i < 5e4; i++) {
  dict.Match('我得甲亢，吃西药已九个多月了。听说贵院一种中药，吃一颗就可以制好。我的病是典型甲亢。我的病可以吃这种药吗？1', 1)
}
console.timeEnd('Match1')


// console.time('Match2')

// for (let i = 0; i < 5e4; i++) {
//   dict.Match('甲亢', 1)
// }
// console.timeEnd('Match2')

// const words = dict.Test('甲亢')
// console.log(words, 'words')
// const dictFile = path.join(__dirname, 'dict.json')
// dict.ToFile(dictFile)
// dict.Delete(['1'])
// const words2 = dict.Match('我得甲亢，吃西药已九个多月了。听说贵院一种中药，吃一颗就可以制好。我的病是典型甲亢。我的病可以吃这种药吗？1')
// console.log(words2)
// // const json = dict.Export()
// // console.log(json)

// dict.FromFile(dictFile)
// const words3 = dict.Match('我得甲亢，吃西药已九个多月了。听说贵院一种中药，吃一颗就可以制好。我的病是典型甲亢。我的病可以吃这种药吗？1')
// console.log(words3)