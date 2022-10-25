"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = __importDefault(require("."));
const dict = new _1.default();
dict.Add(['1', '2', '3', '甲亢']);
for (let i = 0; i < 1e4; i++) {
    dict.Match('我得甲亢，吃西药已九个多月了。听说贵院一种中药，吃一颗就可以制好。我的病是典型甲亢。我的病可以吃这种药吗？1', 1);
    dict.Test('我得甲亢，吃西药已九个多月了。听说贵院一种中药，吃一颗就可以制好。我的病是典型甲亢。我的病可以吃这种药吗？1');
}
console.time('Test');
for (let i = 0; i < 5e4; i++) {
    dict.Test('我得甲亢，吃西药已九个多月了。听说贵院一种中药，吃一颗就可以制好。我的病是典型甲亢。我的病可以吃这种药吗？1');
}
console.timeEnd('Test');
console.time('Match1');
for (let i = 0; i < 5e4; i++) {
    dict.Match('我得甲亢，吃西药已九个多月了。听说贵院一种中药，吃一颗就可以制好。我的病是典型甲亢。我的病可以吃这种药吗？1', 1);
}
console.timeEnd('Match1');
console.time('2');
for (let i = 0; i < 1e4; i++) {
    1 > 0;
}
console.timeEnd('2');
console.time('1');
for (let i = 0; i < 1e4; i++) {
    Boolean(1);
}
console.timeEnd('1');
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
