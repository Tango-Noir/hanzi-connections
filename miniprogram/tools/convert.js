// 把根目录的 puzzles*.js（window.PUZZLES*）转换成 data/*.json
// 用法：在本文件夹（miniprogram）下运行  node tools/convert.js
// 加完新题后重新跑一次，再重新上传小程序即可
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const outDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(outDir, { recursive: true });

for (const [f, varName] of [
  ['puzzles.js', 'PUZZLES'],
  ['puzzles-2zi.js', 'PUZZLES_2ZI'],
  ['puzzles-4zi.js', 'PUZZLES_4ZI'],
]) {
  const src = path.join(root, f);
  const sandbox = {};
  new Function('window', fs.readFileSync(src, 'utf8') + ';return window.' + varName)(sandbox);
  const data = sandbox[varName];
  if (!Array.isArray(data)) throw new Error(f + ' 转换失败（不是数组）');
  const out = f.replace('.js', '.json');
  fs.writeFileSync(path.join(outDir, out), JSON.stringify(data, null, 2));
  const dates = data.map((p) => p.date).sort();
  console.log(out, '→', data.length, '题（', dates.join(' / '), '）');
}
console.log('完成。data/ 已更新。');
