export const scheduleConfig = {
  timezone: "Asia/Shanghai",
  weeklySchedule: {
    mondayToSaturday: {
      days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      blocks: [
        {
          start: "06:00",
          end: "06:30",
          type: "wake",
          availability: "limited",
          condition: {
            fatigue: 58,
            busyness: 20,
            irritability: 16,
            hunger: 55
          },
          label: "起床",
          modes: [
            {
              name: "morning_prep",
              weight: 7,
              label: "晨间整理",
              location: "主教府卧室",
              items: [
                {
                  label: "洗漱梳头",
                  weight: 1,
                  location: "主教府盥洗室",
                  details: "清洗整理，驱散刚起床的迟滞感。"
                },
                {
                  label: "刮脸",
                  weight: 1,
                  location: "主教府盥洗室",
                  details: "对着镜子做简短而利落的晨间修整。"
                },
                {
                  label: "穿衣整理",
                  weight: 1,
                  location: "主教卧室",
                  details: "换上白色主教袍，准备进入一天的正式安排。"
                }
              ]
            },
            {
              name: "sleep_in",
              weight: 1,
              label: "赖床",
              location: "主教府卧室",
              items: [
                {
                  label: "赖床中",
                  weight: 2,
                  location: "主教府卧室",
                  details: "正在装死，完全不想起。"
                },
                {
                  label: "跟床伴一起赖床中",
                  weight: 1,
                  location: "主教府卧室",
                  details: "沉迷温柔乡，完全不想起。"
                }
              ]
            }
          ]
        },
        {
          start: "06:30",
          end: "07:30",
          type: "prayer",
          availability: "limited",
          condition: {
            fatigue: 48,
            busyness: 25,
            irritability: 10,
            hunger: 62
          },
          label: "晨祷",
          modes: [
            {
              name: "chapel_prayer",
              weight: 4,
              label: "小礼拜堂晨祷",
              location: "主教府",
              items: [
                {
                  label: "独自晨祷",
                  weight: 1,
                  location: "主教卧室",
                  details: "独自进行简短而安静的晨间祷告。"
                },
                {
                  label: "参加主教府晨祷",
                  weight: 1,
                  location: "主教府小礼拜堂",
                  details: "去主教府小礼拜堂，与同工共同晨祷。"
                }
              ]
            }
          ]
        },
        {
          start: "07:30",
          end: "08:30",
          type: "meal",
          availability: "limited",
          condition: {
            fatigue: 36,
            busyness: 18,
            irritability: 8,
            hunger: 18
          },
          label: "早饭",
          modes: [
            {
              name: "simple_breakfast",
              weight: 1,
              label: "简单早餐",
              location: "主教府",
              items: [
                {
                  label: "餐厅早餐",
                  weight: 1,
                  location: "主教府餐厅",
                  details: "与同工一同吃克制而简单的早餐。"
                },
                {
                  label: "办公室早餐",
                  weight: 1,
                  location: "主教办公室",
                  details: "在办公室吃早餐，顺便看报纸。"
                }
              ]
            }
          ]
        },
        {
          start: "08:30",
          end: "13:00",
          type: "work",
          availability: "busy",
          condition: {
            fatigue: 42,
            busyness: 82,
            irritability: 14,
            hunger: 46
          },
          label: "上午工作",
          modes: [
            {
              name: "office_work",
              weight: 1,
              label: "办公室事务",
              location: "主教办公室",
              items: [
                {
                  label: "读信",
                  weight: 1,
                  location: "主教办公室",
                  details: "查看教区来信与需要回复的函件。"
                },
                {
                  label: "处理行政事务",
                  weight: 1,
                  location: "主教办公室",
                  details: "处理教区内的行政与文书工作。"
                },
                {
                  label: "会见来访者",
                  weight: 1,
                  location: "主教府会客室",
                  details: "接待来访者，听取汇报或简短谈话。"
                }
              ]
            }
          ]
        },
        {
          start: "13:00",
          end: "15:00",
          type: "social_meal",
          availability: "limited",
          condition: {
            fatigue: 50,
            busyness: 55,
            irritability: 12,
            hunger: 15
          },
          label: "午餐与社交",
          modes: [
            {
              name: "quiet_lunch",
              weight: 5,
              label: "午餐",
              location: "主教府餐厅",
              items: [
                {
                  label: "普通午餐",
                  weight: 4,
                  location: "主教府餐厅",
                  details: "与同工一同吃午餐。"
                },
                {
                  label: "聊教会事务",
                  weight: 3,
                  location: "主教府餐厅",
                  details: "围绕教会事务交换意见。"
                },
                {
                  label: "谈人事安排",
                  weight: 2,
                  location: "主教府图书室",
                  details: "在更安静的房间里谈人事安排等实际问题。"
                },
                {
                  label: "午餐后短暂休息",
                  weight: 1,
                  location: "主教府图书室",
                  details: "饭后在图书室短暂停留，整理思绪。"
                }
              ]
            },
            {
              name: "with_guest",
              weight: 2,
              label: "与客人共餐",
              location: "主教府餐厅",
              items: [
                {
                  label: "接待客人共餐",
                  weight: 3,
                  location: "主教府餐厅",
                  details: "一边用餐一边维持必要社交。"
                },
                {
                  label: "聊地方政治",
                  weight: 1,
                  location: "主教府餐厅",
                  details: "与客人轻松谈地方政治。"
                }
              ]
            }
          ]
        },
        {
          start: "15:00",
          end: "18:00",
          type: "afternoon",
          availability: "busy",
          condition: {
            fatigue: 60,
            busyness: 76,
            irritability: 18,
            hunger: 34
          },
          label: "下午事务",
          modes: [
            {
              name: "residence_work",
              weight: 5,
              label: "主教府内务",
              location: "主教府",
              items: [
                {
                  label: "处理文件",
                  weight: 1,
                  location: "主教办公室",
                  details: "处理积压文件与需要签阅的事务。"
                },
                {
                  label: "写信",
                  weight: 1,
                  location: "主教办公室",
                  details: "写回信或起草需要送出的正式书信。"
                },
                {
                  label: "阅读",
                  weight: 1,
                  location: "主教府图书室",
                  details: "阅读宗教哲学著作。"
                }
              ]
            },
            {
              name: "diocese_visit",
              weight: 2,
              label: "巡视教区",
              location: "亚楠城",
              items: [
                {
                  label: "乘马车出行",
                  weight: 1,
                  location: "路上",
                  details: "从主教府前往教区的路途中。"
                },
                {
                  label: "骑马出行",
                  weight: 1,
                  location: "路上",
                  details: "从主教府前往教区的路途中。"
                },
                {
                  label: "巡视教区",
                  weight: 1,
                  location: "教区",
                  details: "查看教区运作情况，留意实际问题。"
                },
                {
                  label: "视察教堂",
                  weight: 1,
                  location: "教堂",
                  details: "亲自查看教堂环境与相关安排。"
                },
                {
                  label: "与牧师谈话",
                  weight: 1,
                  location: "牧师住处",
                  details: "和当地牧师面对面交谈，询问近况与难题。"
                }
              ]
            }
          ]
        },
        {
          start: "18:00",
          end: "19:00",
          type: "meal",
          availability: "limited",
          condition: {
            fatigue: 62,
            busyness: 24,
            irritability: 10,
            hunger: 14
          },
          label: "晚餐",
          modes: [
            {
              name: "simple_dinner",
              weight: 1,
              label: "简单晚餐",
              location: "主教府餐厅",
              items: [
                {
                  label: "普通晚餐",
                  weight: 1,
                  location: "主教府餐厅",
                  details: "吃一顿简短而安静的晚饭，顺便整理思绪。"
                },
                {
                  label: "与Ludwig共进晚餐",
                  weight: 1,
                  location: "主教的起居室",
                  details: "在主教套房的起居室与Ludwig一起吃晚饭。"
                }
              ]
            }
          ]
        },
        {
          start: "19:00",
          end: "22:00",
          type: "evening",
          availability: "open",
          condition: {
            fatigue: 52,
            busyness: 26,
            irritability: 8,
            hunger: 28
          },
          label: "晚间时间",
          modes: [
            {
              name: "solitude",
              weight: 5,
              label: "独处",
              location: "主教府",
              items: [
                {
                  label: "独处",
                  weight: 1,
                  location: "主教套房",
                  details: "把白天的热闹隔开，独自安静一会儿。"
                },
                {
                  label: "读书",
                  weight: 1,
                  location: "主教府图书室",
                  details: "翻阅手边的书与材料。"
                },
                {
                  label: "继续工作",
                  weight: 1,
                  location: "主教办公室",
                  details: "晚间仍抽空继续处理未完的文书工作。"
                }
              ]
            },
            {
              name: "social_evening",
              weight: 2,
              label: "晚间交流",
              location: "主教府",
              items: [
                {
                  label: "与朋友交流",
                  weight: 1,
                  location: "主教府会客室",
                  details: "与熟人保持克制而自然的交谈。"
                }
              ]
            },
            {
              name: "lab_evening",
              weight: 1,
              label: "实验研究",
              location: "研究大厅",
              items: [
                {
                  label: "实验",
                  weight: 1,
                  location: "研究大厅",
                  details: "去研究大厅亲自检查实验进展。"
                }
              ]
            }
          ]
        },
        {
          start: "22:00",
          end: "06:00",
          type: "sleep",
          availability: "rest",
          condition: {
            fatigue: 28,
            busyness: 5,
            irritability: 6,
            hunger: 22
          },
          label: "睡觉",
          crossesMidnight: true,
          modes: [
            {
              name: "night_rest",
              weight: 5,
              label: "夜间休息",
              location: "主教府卧室",
              items: [
                {
                  label: "入睡",
                  weight: 7,
                  location: "主教府卧室",
                  details: "已经睡着。"
                },
                {
                  label: "夜间活动",
                  weight: 1,
                  location: "主教府卧室",
                  details: "与Ludwig交流激情与理性的冲突。"
                }
              ]
            },
            {
              name: "social_night",
              weight: 1,
              label: "夜间交往",
              location: "Mary的家",
              items: [
                {
                  label: "入睡",
                  weight: 1,
                  location: "Mary的卧室",
                  details: "已经睡着。"
                },
                {
                  label: "夜间活动",
                  weight: 1,
                  location: "Mary的卧室",
                  details: "跟Mary一同探讨人生的意义。"
                }
              ]
            }
          ]
        }
      ]
    },
    sunday: {
      days: ["sunday"],
      blocks: [
        {
          start: "06:00",
          end: "06:30",
          type: "wake",
          availability: "limited",
          condition: {
            fatigue: 56,
            busyness: 18,
            irritability: 14,
            hunger: 52
          },
          label: "起床",
          modes: [
            {
              name: "sunday_prep",
              weight: 1,
              label: "主日前整理",
              location: "主教府卧室与盥洗室",
              items: [
                {
                  label: "洗漱整理",
                  weight: 1,
                  location: "主教府盥洗室",
                  details: "准备主日晨间活动，动作比平日更利落。"
                },
                {
                  label: "换衣准备",
                  weight: 1,
                  location: "主教卧室",
                  details: "尽快换好衣服，预备接下来的晨祷与礼拜安排。"
                }
              ]
            }
          ]
        },
        {
          start: "06:30",
          end: "07:30",
          type: "prayer",
          availability: "limited",
          condition: {
            fatigue: 46,
            busyness: 22,
            irritability: 9,
            hunger: 58
          },
          label: "晨祷",
          modes: [
            {
              name: "chapel_prayer",
              weight: 4,
              label: "小礼拜堂晨祷",
              location: "主教府小礼拜堂",
              items: [
                {
                  label: "主日晨祷",
                  weight: 1,
                  location: "主教府小礼拜堂",
                  details: "主日前的晨祷，心绪更集中于接下来的礼拜。"
                }
              ]
            }
          ]
        },
        {
          start: "07:30",
          end: "08:00",
          type: "meal",
          availability: "limited",
          condition: {
            fatigue: 34,
            busyness: 16,
            irritability: 8,
            hunger: 16
          },
          label: "早饭",
          modes: [
            {
              name: "brief_breakfast",
              weight: 1,
              label: "简短早餐",
              location: "主教府餐厅",
              items: [
                {
                  label: "快速早餐",
                  weight: 1,
                  location: "主教府餐厅",
                  details: "用一顿简短早餐为礼拜前准备留出时间。"
                }
              ]
            }
          ]
        },
        {
          start: "08:00",
          end: "10:00",
          type: "pre_service_work",
          availability: "busy",
          condition: {
            fatigue: 40,
            busyness: 72,
            irritability: 12,
            hunger: 32
          },
          label: "礼拜前准备",
          modes: [
            {
              name: "service_preparation",
              weight: 1,
              label: "礼拜前准备",
              location: "主教办公室",
              items: [
                {
                  label: "快速处理一些信件",
                  weight: 1,
                  location: "主教办公室",
                  details: "在礼拜前清掉最紧要的来信和文书。"
                },
                {
                  label: "穿祭服",
                  weight: 1,
                  location: "主教府更衣室",
                  details: "为主日礼拜换上正式祭服。"
                }
              ]
            }
          ]
        },
        {
          start: "10:00",
          end: "12:00",
          type: "service",
          availability: "unavailable",
          condition: {
            fatigue: 50,
            busyness: 90,
            irritability: 15,
            hunger: 48
          },
          label: "礼拜",
          modes: [
            {
              name: "main_service",
              weight: 1,
              label: "主日礼拜",
              location: "教堂",
              items: [
                {
                  label: "坐在主教席",
                  weight: 1,
                  location: "教堂",
                  details: "以主教身份在礼拜中保持在场与秩序。"
                },
                {
                  label: "讲道",
                  weight: 1,
                  location: "讲台",
                  details: "在需要时亲自讲道。"
                },
                {
                  label: "主持坚振",
                  weight: 1,
                  location: "教堂祭台前",
                  details: "主持主日中的坚振仪式。"
                },
                {
                  label: "主持按立",
                  weight: 1,
                  location: "教堂祭台前",
                  details: "在特定礼拜中主持按立。"
                }
              ]
            }
          ]
        },
        {
          start: "13:00",
          end: "15:00",
          type: "social_meal",
          availability: "limited",
          condition: {
            fatigue: 52,
            busyness: 52,
            irritability: 11,
            hunger: 14
          },
          label: "午餐与社交",
          modes: [
            {
              name: "quiet_lunch",
              weight: 4,
              label: "安静午餐",
              location: "主教府餐厅",
              items: [
                {
                  label: "安静午餐",
                  weight: 3,
                  location: "主教府餐厅",
                  details: "主日礼拜后终于安静吃一顿午饭。"
                },
                {
                  label: "饭后短暂休息",
                  weight: 2,
                  location: "主教府图书室",
                  details: "午饭后稍作休息，避免继续被事务拉走。"
                }
              ]
            },
            {
              name: "with_guest",
              weight: 2,
              label: "与客人社交",
              location: "主教府餐厅",
              items: [
                {
                  label: "接待客人共餐",
                  weight: 3,
                  location: "主教府餐厅",
                  details: "与来客共进午餐，维持必要社交。"
                },
                {
                  label: "聊教会事务",
                  weight: 3,
                  location: "主教府餐厅",
                  details: "围绕礼拜后的教会事务继续交谈。"
                }
              ]
            }
          ]
        },
        {
          start: "15:00",
          end: "18:00",
          type: "afternoon",
          availability: "open",
          condition: {
            fatigue: 42,
            busyness: 30,
            irritability: 8,
            hunger: 30
          },
          label: "下午事务或休闲",
          modes: [
            {
              name: "residence_work",
              weight: 5,
              label: "主教府内务",
              location: "主教府",
              items: [
                {
                  label: "处理文件",
                  weight: 1,
                  location: "主教办公室",
                  details: "利用主日下午补一些轻量事务。"
                },
                {
                  label: "写信",
                  weight: 1,
                  location: "主教办公室",
                  details: "处理仍需要寄出的书信。"
                },
                {
                  label: "阅读",
                  weight: 1,
                  location: "主教府图书室",
                  details: "在图书室安静阅读。"
                }
              ]
            },
            {
              name: "leisure_social",
              weight: 3,
              label: "休闲与会友",
              location: "主教府周边",
              items: [
                {
                  label: "与朋友休闲",
                  weight: 1,
                  location: "主教府会客室",
                  details: "与熟人保持轻松而克制的往来。"
                },
                {
                  label: "跟Ludwig聊天",
                  weight: 1,
                  location: "主教府小客厅",
                  details: "与Ludwig闲聊，东拉西扯。"
                },
                {
                  label: "听Ludwig练琴",
                  weight: 1,
                  location: "Ludwig的起居室",
                  details: "在旁边安静听Ludwig练琴，帮忙翻谱。"
                },
                {
                  label: "出门散步",
                  weight: 1,
                  location: "公园",
                  details: "到外面短暂散步，让脑子放松一点。"
                },
                {
                  label: "与其他朋友散步",
                  weight: 1,
                  location: "主教府花园",
                  details: "与朋友边走边聊，保持轻松节奏。"
                }
              ]
            }
          ]
        },
        {
          start: "18:00",
          end: "19:00",
          type: "meal",
          availability: "limited",
          condition: {
            fatigue: 46,
            busyness: 18,
            irritability: 8,
            hunger: 12
          },
          label: "晚餐",
          modes: [
            {
              name: "simple_dinner",
              weight: 1,
              label: "简单晚餐",
              location: "主教府餐厅",
              items: [
                {
                  label: "独自晚餐",
                  weight: 1,
                  location: "主教府餐厅",
                  details: "以平静节奏结束主日的晚餐时间。"
                },
                {
                  label: "与Ludwig共进晚餐",
                  weight: 1,
                  location: "Ludwig的房间",
                  details: "到Ludwig的房间，一起吃晚饭。"
                }
              ]
            }
          ]
        },
        {
          start: "19:00",
          end: "22:00",
          type: "evening",
          availability: "open",
          condition: {
            fatigue: 36,
            busyness: 16,
            irritability: 6,
            hunger: 24
          },
          label: "轻松的晚间时间",
          modes: [
            {
              name: "restful_evening",
              weight: 5,
              label: "轻松晚间",
              location: "主教府图书室",
              items: [
                {
                  label: "轻松休息",
                  weight: 1,
                  location: "主教府图书室",
                  details: "主日夜晚难得较少公务压力。"
                },
                {
                  label: "读书",
                  weight: 1,
                  location: "主教府图书室",
                  details: "安静翻书，不再主动扩展事务。"
                },
                {
                  label: "闲谈",
                  weight: 1,
                  location: "主教府会客室",
                  details: "与熟人轻松交谈，节奏放缓。"
                }
              ]
            }
          ]
        },
        {
          start: "22:00",
          end: "06:00",
          type: "sleep",
          availability: "rest",
          condition: {
            fatigue: 24,
            busyness: 5,
            irritability: 5,
            hunger: 20
          },
          label: "睡觉",
          crossesMidnight: true,
          modes: [
            {
              name: "night_rest",
              weight: 5,
              label: "夜间休息",
              location: "主教府卧室",
              items: [
                {
                  label: "入睡",
                  weight: 6,
                  location: "主教府卧室",
                  details: "已经睡着。"
                },
                {
                  label: "夜间活动",
                  weight: 1,
                  location: "主教府卧室",
                  details: "与Ludwig讨论艺术与信仰的融合。"
                }
              ]
            },
            {
              name: "social_night",
              weight: 1,
              label: "夜间交往",
              location: "Mary的家",
              items: [
                {
                  label: "入睡",
                  weight: 1,
                  location: "Mary的卧室",
                  details: "已经睡着。"
                },
                {
                  label: "夜间活动",
                  weight: 1,
                  location: "Mary的卧室",
                  details: "跟Mary谈论宗教与哲学的意义。"
                }
              ]
            }
          ]
        }
      ]
    }
  }
};