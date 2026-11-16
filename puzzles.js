// 题目数据由出题人填写，代码只读取，不做任何判断。
window.PUZZLES = [
  {
    "date": "2026-11-13",
    "items": [
      "新",
      "桂",
      "吉",
      "宁",
      "压",
      "偶",
      "势",
      "容",
      "举",
      "除",
      "贬",
      "领",
      "梅",
      "条",
      "鸡",
      "万"
    ],
    "groups": [
      {
        "category": "省份简称",
        "items": [
          "新",
          "桂",
          "吉",
          "宁"
        ],
        "color": "yellow"
      },
      {
        "category": "物理名词：电_",
        "items": [
          "压",
          "偶",
          "势",
          "容"
        ],
        "color": "green"
      },
      {
        "category": "官职任免",
        "items": [
          "举",
          "除",
          "贬",
          "领"
        ],
        "color": "blue"
      },
      {
        "category": "麻将牌",
        "items": [
          "梅",
          "条",
          "鸡",
          "万"
        ],
        "color": "purple"
      }
    ]
  },
  {
    "date": "2026-11-14",
    "items": [
      "容",
      "纳",
      "盛",
      "装",
      "子",
      "午",
      "未",
      "丑",
      "周",
      "凤",
      "问",
      "冈",
      "福",
      "苏",
      "兰",
      "广"
    ],
    "groups": [
      {
        "category": "表示容纳",
        "items": [
          "容",
          "纳",
          "盛",
          "装"
        ],
        "color": "yellow"
      },
      {
        "category": "地支",
        "items": [
          "子",
          "午",
          "未",
          "丑"
        ],
        "color": "green"
      },
      {
        "category": "三面包围，开口朝下",
        "items": [
          "周",
          "凤",
          "问",
          "冈"
        ],
        "color": "blue"
      },
      {
        "category": "_州",
        "items": [
          "福",
          "苏",
          "兰",
          "广"
        ],
        "color": "purple"
      }
    ]
  },
  {
    "date": "2026-11-15",
    "items": [
      "美",
      "泰",
      "法",
      "德",
      "泼",
      "沓",
      "汞",
      "莎",
      "厘",
      "分",
      "尺",
      "丈",
      "拼",
      "淘",
      "京",
      "唯"
    ],
    "groups": [
      {
        "category": "_国",
        "items": [
          "美",
          "泰",
          "法",
          "德"
        ],
        "color": "yellow"
      },
      {
        "category": "含有水",
        "items": [
          "泼",
          "沓",
          "汞",
          "莎"
        ],
        "color": "green"
      },
      {
        "category": "长度单位",
        "items": [
          "厘",
          "分",
          "尺",
          "丈"
        ],
        "color": "blue"
      },
      {
        "category": "购物软件",
        "items": [
          "拼",
          "淘",
          "京",
          "唯"
        ],
        "color": "purple"
      }
    ]
  },
  {
    "date": "2026-11-16",
    "items": [
      "本",
      "专",
      "硕",
      "博",
      "清",
      "明",
      "商",
      "周",
      "渝",
      "易",
      "改",
      "违",
      "质",
      "电",
      "中",
      "光"
    ],
    "groups": [
      {
        "category": "学历",
        "items": [
          "本",
          "专",
          "硕",
          "博"
        ],
        "color": "yellow"
      },
      {
        "category": "朝代",
        "items": [
          "清",
          "明",
          "商",
          "周"
        ],
        "color": "green"
      },
      {
        "category": "违背，改变",
        "items": [
          "渝",
          "易",
          "改",
          "违"
        ],
        "color": "blue"
      },
      {
        "category": "物理粒子",
        "items": [
          "质",
          "电",
          "中",
          "光"
        ],
        "color": "purple"
      }
    ]
  }
];

// 数据格式（每条题目）：
// {
//   date: string，格式 "YYYY-MM-DD"
//   items: string[16]，16 个不重复的汉字
//   groups: Array<{ category: string, items: string[4], color?: "yellow" | "green" | "blue" | "purple" }>，4 组，每组 4 个
// }
// category 完全由出题人填写，代码只负责显示。
// color 可选，只用于已解出组和结算面板的样式。
