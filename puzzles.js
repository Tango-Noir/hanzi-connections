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
  }
];

// 数据格式（每条题目）：
// {
//   date: string，格式 "YYYY-MM-DD"
//   items: string[16]，16 个不重复的汉字
//   groups: Array<{ category: string, items: string[4], color?: "yellow" | "green" | "blue" | "purple" }>，4 组，每组 4 个字
// }
// category 完全由出题人填写，代码只负责显示。
// color 可选，只用于已解出组和结算面板的样式。
