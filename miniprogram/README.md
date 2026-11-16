# 汉字联系 · 微信小程序

与网页版（`../index.html` + `app.js`）逻辑 1:1 对应的原生小程序，无第三方依赖。

## 导入

1. 打开**微信开发者工具** → 导入项目 → 目录选本文件夹
2. AppID 填你自己的小程序 AppID（或选"测试号"）
3. 模拟器里即可试玩；点右上角"预览"用真机扫码

## 结构

```
├── project.config.json   # appid 可替换为 touristappid（体验模式）
├── app.json / app.js / app.wxss
├── utils/game.js         # 纯逻辑（种子洗牌/判题/差一点/日历规则），CommonJS
├── data/
│   ├── puzzles.json      # 单字题库（从 puzzles.js 转换）
│   ├── puzzles-2zi.json  # 二字题库
│   └── puzzles-4zi.json  # 四字题库
└── pages/index/          # 单页应用，结构对应网页版
```

## 添加题目（与网页版同样的流程）

1. 编辑 `data/puzzles*.json`，按日期追加一条：
   ```json
   { "date": "2026-11-16", "items": ["16 个字或词"], "groups": [
     { "category": "联系", "items": ["4 个"], "color": "yellow" }
   ]}
   ```
   颜色四选一：yellow / green / blue / purple
2. 重新上传版本即可，无需改其他代码

## 与网页版的差异

- `window.PUZZLES*` → `data/*.json`
- `document.createElement` 渲染 → WXML 数据绑定
- 日历为**自绘**（与网页版完全相同的规则：只有有题的日期可点、整月无题不可翻、未来日期不可点）
- 确定性洗牌算法逐行相同（FNV-1a + mulberry32），同一日期同一模式下，网页版与小程序版开局布局完全一致
