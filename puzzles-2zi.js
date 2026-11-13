// 题目数据由出题人填写，代码只读取，不做任何判断。
window.PUZZLES_2ZI = [
  {
    "date": "2026-11-12",
    "items": [
      "邮件",
      "短信",
      "快件",
      "包裹",
      "沙发",
      "咖啡",
      "吉他",
      "坦克",
      "宽松",
      "厚实",
      "透气",
      "朴素",
      "冰冷",
      "火热",
      "笔直",
      "雪白"
    ],
    "groups": [
      {
        "category": "需要寄的东西",
        "items": [
          "邮件",
          "短信",
          "快件",
          "包裹"
        ],
        "color": "yellow"
      },
      {
        "category": "外来音译词",
        "items": [
          "沙发",
          "咖啡",
          "吉他",
          "坦克"
        ],
        "color": "green"
      },
      {
        "category": "形容服装",
        "items": [
          "宽松",
          "厚实",
          "透气",
          "朴素"
        ],
        "color": "blue"
      },
      {
        "category": "前字表程度/比喻",
        "items": [
          "冰冷",
          "火热",
          "笔直",
          "雪白"
        ],
        "color": "purple"
      }
    ]
  },
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
