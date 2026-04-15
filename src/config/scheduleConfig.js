export const scheduleConfig = {
  timezone: "America/Los_Angeles",
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
          details: "开始一天，准备晨间活动。"
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
          location: "主教府小礼拜堂",
          details: "晨祷，偶尔独自进行。"
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
          details: "简单早餐与晨间整理。"
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
          details: ["读信", "处理行政事务", "会见来访者"]
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
          details: ["可能有客人", "聊教会事务", "地方政治", "人事安排等"]
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
              details: ["在主教府处理文件", "写信", "阅读"]
            },
            {
              name: "diocese_visit",
              details: ["偶尔巡视教区", "坐马车或骑马出行", "视察教堂", "与牧师谈话"]
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
          details: "简单的晚餐。"
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
          details: ["独处", "读书", "与朋友或亲属交流", "经常继续处理文件或信件"]
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
          details: "夜间休息。"
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
          details: "开始一天，准备晨间活动。"
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
          location: "主教府小礼拜堂",
          details: "晨祷。"
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
          details: "简单早餐。"
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
          details: ["快速处理一些信件", "穿礼服"]
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
          details: ["坐在主教席", "偶尔讲道", "偶尔主持坚振", "偶尔主持按立"]
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
          details: ["可能有客人", "聊教会事务", "聊地方政治", "聊人事安排"]
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
              details: ["在主教府处理文件", "写信", "阅读"]
            },
            {
              name: "leisure_social",
              details: ["偶尔与朋友休闲", "跟Ludwig聊天", "听Ludwig练琴", "出门散步", "与其他朋友散步或闲聊"]
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
          details: "简单的晚餐。"
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
          details: ["轻松休息", "读书", "闲谈", "较少公务压力"]
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
          details: "夜间休息。"
        }
      ]
    }
  }
};
