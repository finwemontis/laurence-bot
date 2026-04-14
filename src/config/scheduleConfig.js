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
          label: "起床",
          details: "开始一天，准备晨间活动。"
        },
        {
          start: "06:30",
          end: "07:30",
          type: "prayer",
          label: "晨祷",
          location: "主教府小礼拜堂",
          details: "晨祷，偶尔独自进行。"
        },
        {
          start: "07:30",
          end: "08:30",
          type: "meal",
          label: "早饭",
          details: "简单早餐与晨间整理。"
        },
        {
          start: "08:30",
          end: "13:00",
          type: "work",
          label: "上午工作",
          details: ["读信", "处理行政事务", "会见来访者"]
        },
        {
          start: "13:00",
          end: "15:00",
          type: "social_meal",
          label: "午餐与社交",
          details: ["可能有客人", "聊教会事务", "地方政治", "人事安排等"]
        },
        {
          start: "15:00",
          end: "18:00",
          type: "afternoon",
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
          label: "晚餐",
          details: "简单的晚餐。"
        },
        {
          start: "19:00",
          end: "22:00",
          type: "evening",
          label: "晚间时间",
          details: ["独处", "读书", "与朋友或亲属交流", "经常继续处理文件或信件"]
        },
        {
          start: "22:00",
          end: "06:00",
          type: "sleep",
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
          label: "起床",
          details: "开始一天，准备晨间活动。"
        },
        {
          start: "06:30",
          end: "07:30",
          type: "prayer",
          label: "晨祷",
          location: "主教府小礼拜堂",
          details: "晨祷。"
        },
        {
          start: "07:30",
          end: "08:00",
          type: "meal",
          label: "早饭",
          details: "简单早餐。"
        },
        {
          start: "08:00",
          end: "10:00",
          type: "pre_service_work",
          label: "礼拜前准备",
          details: ["快速处理一些信件", "穿礼服"]
        },
        {
          start: "10:00",
          end: "12:00",
          type: "service",
          label: "礼拜",
          availability: "unavailable",
          details: ["坐在主教席", "偶尔讲道", "主持坚振与按立"]
        },
        {
          start: "13:00",
          end: "15:00",
          type: "social_meal",
          label: "午餐与社交",
          details: ["可能有客人", "聊教会事务", "地方政治", "人事安排等"]
        },
        {
          start: "15:00",
          end: "18:00",
          type: "afternoon",
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
          label: "晚餐",
          details: "简单的晚餐。"
        },
        {
          start: "19:00",
          end: "22:00",
          type: "evening",
          label: "轻松的晚间时间",
          details: ["轻松休息", "读书", "闲谈", "较少公务压力"]
        },
        {
          start: "22:00",
          end: "06:00",
          type: "sleep",
          label: "睡觉",
          crossesMidnight: true,
          details: "夜间休息。"
        }
      ]
    }
  }
};
