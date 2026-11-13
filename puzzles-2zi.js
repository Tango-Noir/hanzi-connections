// 题目数据由出题人填写，代码只读取，不做任何判断。
window.PUZZLES_2ZI = [
  {
    "date": "2026-11-13",
    "items": [
      "肥皂",
      "镜子",
      "马桶",
      "纸巾",
      "游戏",
      "电话",
      "年糕",
      "篮球",
      "牛奶",
      "蜂蜜",
      "王国",
      "火柴",
      "杏仁",
      "队伍",
      "轨道",
      "什锦"
    ],
    "groups": [
      {
        "category": "卫生间中的物品",
        "items": [
          "肥皂",
          "镜子",
          "马桶",
          "纸巾"
        ],
        "color": "yellow"
      },
      {
        "category": "可以打的东西",
        "items": [
          "游戏",
          "电话",
          "年糕",
          "篮球"
        ],
        "color": "green"
      },
      {
        "category": "倒过来仍为名词",
        "items": [
          "牛奶",
          "蜂蜜",
          "王国",
          "火柴"
        ],
        "color": "blue"
      },
      {
        "category": "其中一字的右半为数字",
        "items": [
          "杏仁",
          "队伍",
          "轨道",
          "什锦"
        ],
        "color": "purple"
      }
    ]
  }
];

// 数据格式（每条题目）：
// {
//   date: string，格式 "YYYY-MM-DD"
//   items: string[16]，16 个不重复的二字词
//   groups: Array<{ category: string, items: string[4], color?: "yellow" | "green" | "blue" | "purple" }>，4 组，每组 4 个
// }
// category 完全由出题人填写，代码只负责显示。
// color 可选，只用于已解出组和结算面板的样式。
