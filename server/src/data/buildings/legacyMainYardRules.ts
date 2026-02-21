/*
 * Auto-generated from legacy YARD_PROPS.as.
 * Source: legacy YARD_PROPS.as (see generator input)
 * Generator: scripts/generate-legacy-main-yard-rules.mjs
 */

export type LegacyBuildRequirement = {
  typeCode: number;
  count: number;
  minLevel: number;
};

export type LegacyBuildCost = {
  r1: number;
  r2: number;
  r3: number;
  r4: number;
  time: number;
  requirements: LegacyBuildRequirement[];
};

export type LegacyMainYardRule = {
  code: number;
  yardType: "main";
  category: string;
  quantityByTownHall: number[];
  costs: LegacyBuildCost[];
  hpByLevel?: number[];
  capacityByLevel?: number[];
  produceByLevel?: number[];
  cycleTimeByLevel?: number[];
  repairTimeByLevel?: number[];
};

export const legacyMainYardBuildingRules: Record<number, LegacyMainYardRule> = {
  "1": {
    "code": 1,
    "yardType": "main",
    "category": "resource",
    "quantityByTownHall": [
      0,
      1,
      2,
      4,
      5,
      6,
      6,
      6,
      6,
      6,
      6
    ],
    "costs": [
      {
        "r1": 0,
        "r2": 750,
        "r3": 0,
        "r4": 0,
        "time": 15,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 0,
        "r2": 1575,
        "r3": 0,
        "r4": 0,
        "time": 300,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 0,
        "r2": 3300,
        "r3": 0,
        "r4": 0,
        "time": 1200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 0,
        "r2": 6950,
        "r3": 0,
        "r4": 0,
        "time": 3600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 0,
        "r2": 14500,
        "r3": 0,
        "r4": 0,
        "time": 7200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 0,
        "r2": 30600,
        "r3": 0,
        "r4": 0,
        "time": 18000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 0,
        "r2": 64300,
        "r3": 0,
        "r4": 0,
        "time": 43200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 0,
        "r2": 135000,
        "r3": 0,
        "r4": 0,
        "time": 86400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 0,
        "r2": 283600,
        "r3": 0,
        "r4": 0,
        "time": 172800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 0,
        "r2": 600000,
        "r3": 0,
        "r4": 0,
        "time": 259200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          }
        ]
      }
    ],
    "hpByLevel": [
      500,
      950,
      1800,
      3400,
      6500,
      12000,
      24000,
      45000,
      85000,
      165000
    ],
    "capacityByLevel": [
      720,
      2160,
      5670,
      13365,
      29160,
      60142,
      118918,
      227584,
      424414,
      775018
    ],
    "produceByLevel": [
      2,
      4,
      7,
      11,
      16,
      22,
      29,
      37,
      46,
      56
    ],
    "cycleTimeByLevel": [
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10
    ],
    "repairTimeByLevel": [
      30,
      60,
      120,
      240,
      480,
      960,
      1920,
      3840,
      7680,
      15360
    ]
  },
  "2": {
    "code": 2,
    "yardType": "main",
    "category": "resource",
    "quantityByTownHall": [
      0,
      1,
      2,
      4,
      5,
      6,
      6,
      6,
      6,
      6,
      6
    ],
    "costs": [
      {
        "r1": 750,
        "r2": 0,
        "r3": 0,
        "r4": 0,
        "time": 15,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 1575,
        "r2": 0,
        "r3": 0,
        "r4": 0,
        "time": 300,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 3300,
        "r2": 0,
        "r3": 0,
        "r4": 0,
        "time": 1200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 6950,
        "r2": 0,
        "r3": 0,
        "r4": 0,
        "time": 3600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 14500,
        "r2": 0,
        "r3": 0,
        "r4": 0,
        "time": 7200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 30600,
        "r2": 0,
        "r3": 0,
        "r4": 0,
        "time": 18000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 64300,
        "r2": 0,
        "r3": 0,
        "r4": 0,
        "time": 43200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 135000,
        "r2": 0,
        "r3": 0,
        "r4": 0,
        "time": 86400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 283600,
        "r2": 0,
        "r3": 0,
        "r4": 0,
        "time": 172800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 600000,
        "r2": 0,
        "r3": 0,
        "r4": 0,
        "time": 259200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          }
        ]
      }
    ],
    "hpByLevel": [
      500,
      950,
      1800,
      3400,
      6500,
      12000,
      24000,
      45000,
      85000,
      165000
    ],
    "capacityByLevel": [
      720,
      2160,
      5670,
      13365,
      29160,
      60142,
      118918,
      227584,
      424414,
      775018
    ],
    "produceByLevel": [
      2,
      4,
      7,
      11,
      16,
      22,
      29,
      37,
      46,
      56
    ],
    "cycleTimeByLevel": [
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10
    ],
    "repairTimeByLevel": [
      30,
      60,
      120,
      240,
      480,
      960,
      1920,
      3840,
      7680,
      15360
    ]
  },
  "3": {
    "code": 3,
    "yardType": "main",
    "category": "resource",
    "quantityByTownHall": [
      0,
      1,
      2,
      4,
      5,
      6,
      6,
      6,
      6,
      6,
      6
    ],
    "costs": [
      {
        "r1": 525,
        "r2": 224,
        "r3": 0,
        "r4": 0,
        "time": 20,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 1102,
        "r2": 470,
        "r3": 0,
        "r4": 0,
        "time": 300,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 2315,
        "r2": 992,
        "r3": 0,
        "r4": 0,
        "time": 1200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 4862,
        "r2": 2086,
        "r3": 0,
        "r4": 0,
        "time": 3600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 10210,
        "r2": 4375,
        "r3": 0,
        "r4": 0,
        "time": 7200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 21441,
        "r2": 9190,
        "r3": 0,
        "r4": 0,
        "time": 18000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 45027,
        "r2": 19298,
        "r3": 0,
        "r4": 0,
        "time": 43200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 94557,
        "r2": 40524,
        "r3": 0,
        "r4": 0,
        "time": 86400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 198570,
        "r2": 85102,
        "r3": 0,
        "r4": 0,
        "time": 172800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 416997,
        "r2": 178716,
        "r3": 0,
        "r4": 0,
        "time": 259200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          }
        ]
      }
    ],
    "hpByLevel": [
      500,
      950,
      1800,
      3400,
      6500,
      12000,
      24000,
      45000,
      85000,
      165000
    ],
    "capacityByLevel": [
      720,
      2160,
      5670,
      13365,
      29160,
      60142,
      118918,
      227584,
      424414,
      775018
    ],
    "produceByLevel": [
      2,
      4,
      7,
      11,
      16,
      22,
      29,
      37,
      46,
      56
    ],
    "cycleTimeByLevel": [
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10
    ],
    "repairTimeByLevel": [
      30,
      60,
      120,
      240,
      480,
      960,
      1920,
      3840,
      7680,
      15360
    ]
  },
  "4": {
    "code": 4,
    "yardType": "main",
    "category": "resource",
    "quantityByTownHall": [
      0,
      1,
      2,
      4,
      5,
      6,
      6,
      6,
      6,
      6,
      6
    ],
    "costs": [
      {
        "r1": 247,
        "r2": 577,
        "r3": 0,
        "r4": 0,
        "time": 20,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 520,
        "r2": 1212,
        "r3": 0,
        "r4": 0,
        "time": 300,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 1090,
        "r2": 2546,
        "r3": 0,
        "r4": 0,
        "time": 1200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 2290,
        "r2": 5348,
        "r3": 0,
        "r4": 0,
        "time": 3600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 4810,
        "r2": 11231,
        "r3": 0,
        "r4": 0,
        "time": 7200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 10108,
        "r2": 23585,
        "r3": 0,
        "r4": 0,
        "time": 18000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 21227,
        "r2": 49529,
        "r3": 0,
        "r4": 0,
        "time": 43200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 44580,
        "r2": 104012,
        "r3": 0,
        "r4": 0,
        "time": 86400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 93600,
        "r2": 218427,
        "r3": 0,
        "r4": 0,
        "time": 172800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 196584,
        "r2": 458696,
        "r3": 0,
        "r4": 0,
        "time": 259200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          }
        ]
      }
    ],
    "hpByLevel": [
      500,
      950,
      1800,
      3400,
      6500,
      12000,
      24000,
      45000,
      85000,
      165000
    ],
    "capacityByLevel": [
      720,
      2160,
      5670,
      13365,
      29160,
      60142,
      118918,
      227584,
      424414,
      775018
    ],
    "produceByLevel": [
      2,
      4,
      7,
      11,
      16,
      22,
      29,
      37,
      46,
      56
    ],
    "cycleTimeByLevel": [
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10
    ],
    "repairTimeByLevel": [
      30,
      60,
      120,
      240,
      480,
      960,
      1920,
      3840,
      7680,
      15360
    ]
  },
  "5": {
    "code": 5,
    "yardType": "main",
    "category": "special",
    "quantityByTownHall": [
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "costs": [
      {
        "r1": 1000,
        "r2": 1000,
        "r3": 500,
        "r4": 0,
        "time": 900,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 20000,
        "r2": 20000,
        "r3": 10000,
        "r4": 0,
        "time": 7200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          },
          {
            "typeCode": 11,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 64300,
        "r2": 64300,
        "r3": 32150,
        "r4": 0,
        "time": 10800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          },
          {
            "typeCode": 11,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 1247840,
        "r2": 1247840,
        "r3": 623920,
        "r4": 0,
        "time": 97200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          },
          {
            "typeCode": 11,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 5500000,
        "r2": 5500000,
        "r3": 2750000,
        "r4": 0,
        "time": 302400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          },
          {
            "typeCode": 11,
            "count": 1,
            "minLevel": 1
          }
        ]
      }
    ],
    "hpByLevel": [
      4000,
      8000,
      16000,
      28000,
      56000
    ],
    "capacityByLevel": [
      250,
      850,
      1500,
      2500,
      3500,
      3500,
      3500
    ],
    "repairTimeByLevel": [
      100,
      300,
      600,
      900,
      900
    ]
  },
  "6": {
    "code": 6,
    "yardType": "main",
    "category": "special",
    "quantityByTownHall": [
      0,
      1,
      2,
      3,
      4,
      5,
      5,
      5,
      5,
      6,
      6
    ],
    "costs": [
      {
        "r1": 3010,
        "r2": 1855,
        "r3": 0,
        "r4": 0,
        "time": 1200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          },
          {
            "typeCode": 1,
            "count": 1,
            "minLevel": 1
          },
          {
            "typeCode": 2,
            "count": 1,
            "minLevel": 1
          },
          {
            "typeCode": 3,
            "count": 1,
            "minLevel": 1
          },
          {
            "typeCode": 4,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 7421,
        "r2": 3710,
        "r3": 0,
        "r4": 0,
        "time": 1800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 14843,
        "r2": 7421,
        "r3": 0,
        "r4": 0,
        "time": 2700,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 29687,
        "r2": 14843,
        "r3": 0,
        "r4": 0,
        "time": 4050,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 59375,
        "r2": 29687,
        "r3": 0,
        "r4": 0,
        "time": 6075,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 118750,
        "r2": 59375,
        "r3": 0,
        "r4": 0,
        "time": 9112,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 237500,
        "r2": 118750,
        "r3": 0,
        "r4": 0,
        "time": 13668,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 475000,
        "r2": 237500,
        "r3": 0,
        "r4": 0,
        "time": 20503,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 950000,
        "r2": 475000,
        "r3": 0,
        "r4": 0,
        "time": 30754,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          }
        ]
      },
      {
        "r1": 1900000,
        "r2": 950000,
        "r3": 0,
        "r4": 0,
        "time": 46132,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 6
          }
        ]
      }
    ],
    "hpByLevel": [
      750,
      1400,
      2550,
      4750,
      8800,
      16250,
      30000,
      55600,
      105000,
      190000
    ],
    "capacityByLevel": [
      7500,
      15000,
      30000,
      60000,
      120000,
      240000,
      480000,
      960000,
      1920000,
      3840000
    ],
    "repairTimeByLevel": [
      30,
      60,
      120,
      240,
      480,
      960,
      1920,
      3840,
      7680,
      15360
    ]
  },
  "7": {
    "code": 7,
    "yardType": "main",
    "category": "mushroom",
    "quantityByTownHall": [
      0
    ],
    "costs": [
      {
        "r1": 0,
        "r2": 0,
        "r3": 0,
        "r4": 0,
        "time": 0,
        "requirements": []
      }
    ],
    "hpByLevel": [
      10
    ],
    "repairTimeByLevel": [
      10
    ]
  },
  "8": {
    "code": 8,
    "yardType": "main",
    "category": "special",
    "quantityByTownHall": [
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "costs": [
      {
        "r1": 1800,
        "r2": 2300,
        "r3": 0,
        "r4": 0,
        "time": 600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 28800,
        "r2": 18400,
        "r3": 0,
        "r4": 0,
        "time": 18000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 115200,
        "r2": 147200,
        "r3": 0,
        "r4": 0,
        "time": 72000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 460800,
        "r2": 588800,
        "r3": 0,
        "r4": 0,
        "time": 129600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          }
        ]
      }
    ],
    "hpByLevel": [
      4000,
      16000,
      32000,
      64000
    ],
    "repairTimeByLevel": [
      480,
      1920,
      3840,
      15360
    ]
  },
  "9": {
    "code": 9,
    "yardType": "main",
    "category": "special",
    "quantityByTownHall": [
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "costs": [
      {
        "r1": 1000,
        "r2": 1000,
        "r3": 1000,
        "r4": 0,
        "time": 300,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          },
          {
            "typeCode": 15,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 10000,
        "r2": 10000,
        "r3": 10000,
        "r4": 0,
        "time": 7200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          },
          {
            "typeCode": 15,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 100000,
        "r2": 100000,
        "r3": 100000,
        "r4": 0,
        "time": 21600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          },
          {
            "typeCode": 15,
            "count": 1,
            "minLevel": 1
          }
        ]
      }
    ],
    "hpByLevel": [
      16000,
      32000,
      64000
    ],
    "repairTimeByLevel": [
      480,
      1920,
      7680
    ]
  },
  "10": {
    "code": 10,
    "yardType": "main",
    "category": "special",
    "quantityByTownHall": [
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "costs": [
      {
        "r1": 250000,
        "r2": 250000,
        "r3": 0,
        "r4": 0,
        "time": 43200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      }
    ],
    "hpByLevel": [
      16000
    ],
    "repairTimeByLevel": [
      3840
    ]
  },
  "11": {
    "code": 11,
    "yardType": "main",
    "category": "special",
    "quantityByTownHall": [
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "costs": [
      {
        "r1": 2000,
        "r2": 2000,
        "r3": 0,
        "r4": 0,
        "time": 900,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 1000000,
        "r2": 1000000,
        "r3": 0,
        "r4": 0,
        "time": 345600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 6
          }
        ]
      }
    ],
    "hpByLevel": [
      5000,
      10000
    ],
    "repairTimeByLevel": [
      300,
      600
    ]
  },
  "12": {
    "code": 12,
    "yardType": "main",
    "category": "special",
    "quantityByTownHall": [
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "costs": [
      {
        "r1": 1080,
        "r2": 720,
        "r3": 0,
        "r4": 0,
        "time": 10,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      }
    ],
    "hpByLevel": [
      4000
    ],
    "repairTimeByLevel": [
      10
    ]
  },
  "13": {
    "code": 13,
    "yardType": "main",
    "category": "special",
    "quantityByTownHall": [
      0,
      1,
      2,
      3,
      4,
      5,
      5,
      5,
      5,
      5,
      5
    ],
    "costs": [
      {
        "r1": 2000,
        "r2": 2000,
        "r3": 0,
        "r4": 0,
        "time": 900,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          },
          {
            "typeCode": 15,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 21227,
        "r2": 49529,
        "r3": 0,
        "r4": 0,
        "time": 3600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 93600,
        "r2": 218427,
        "r3": 0,
        "r4": 0,
        "time": 43200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      }
    ],
    "hpByLevel": [
      4000,
      16000,
      32000
    ],
    "repairTimeByLevel": [
      60,
      150,
      300
    ]
  },
  "14": {
    "code": 14,
    "yardType": "main",
    "category": "special",
    "quantityByTownHall": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "costs": [
      {
        "r1": 0,
        "r2": 0,
        "r3": 0,
        "r4": 0,
        "time": 10,
        "requirements": []
      },
      {
        "r1": 7000,
        "r2": 7000,
        "r3": 0,
        "r4": 0,
        "time": 600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 42000,
        "r2": 42000,
        "r3": 0,
        "r4": 0,
        "time": 14400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 240000,
        "r2": 240000,
        "r3": 0,
        "r4": 0,
        "time": 57600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 1400000,
        "r2": 1400000,
        "r3": 0,
        "r4": 0,
        "time": 172800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 7560000,
        "r2": 7560000,
        "r3": 0,
        "r4": 0,
        "time": 345600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          }
        ]
      },
      {
        "r1": 11340000,
        "r2": 11340000,
        "r3": 0,
        "r4": 0,
        "time": 518400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 6
          }
        ]
      },
      {
        "r1": 14420000,
        "r2": 14420000,
        "r3": 0,
        "r4": 0,
        "time": 691200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 7
          }
        ]
      },
      {
        "r1": 18680000,
        "r2": 18680000,
        "r3": 0,
        "r4": 0,
        "time": 1036800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 8
          }
        ]
      },
      {
        "r1": 25000000,
        "r2": 25000000,
        "r3": 0,
        "r4": 0,
        "time": 1209600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 9
          }
        ]
      }
    ],
    "hpByLevel": [
      4000,
      8800,
      20000,
      42000,
      94000,
      200000,
      300000,
      400000,
      500000,
      600000
    ],
    "repairTimeByLevel": [
      480,
      1920,
      3840,
      7680,
      15360,
      30720,
      64800,
      86400,
      172800,
      345600
    ]
  },
  "15": {
    "code": 15,
    "yardType": "main",
    "category": "special",
    "quantityByTownHall": [
      0,
      1,
      1,
      2,
      2,
      3,
      3,
      3,
      4,
      4,
      4
    ],
    "costs": [
      {
        "r1": 2160,
        "r2": 2160,
        "r3": 0,
        "r4": 0,
        "time": 300,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 8640,
        "r2": 8640,
        "r3": 0,
        "r4": 0,
        "time": 4500,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 34560,
        "r2": 34560,
        "r3": 0,
        "r4": 0,
        "time": 10800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 138240,
        "r2": 138240,
        "r3": 0,
        "r4": 0,
        "time": 28800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 552960,
        "r2": 552960,
        "r3": 0,
        "r4": 0,
        "time": 72000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 6
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 2211840,
        "r2": 2211840,
        "r3": 0,
        "r4": 0,
        "time": 144000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 6
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 4000000,
        "r2": 4000000,
        "r3": 0,
        "r4": 0,
        "time": 216000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 7
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 8000000,
        "r2": 8000000,
        "r3": 0,
        "r4": 0,
        "time": 216000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 8
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 16000000,
        "r2": 16000000,
        "r3": 0,
        "r4": 0,
        "time": 216000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 9
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 32000000,
        "r2": 32000000,
        "r3": 0,
        "r4": 0,
        "time": 216000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 10
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 1
          }
        ]
      }
    ],
    "hpByLevel": [
      4000,
      14000,
      25000,
      43000,
      75000,
      130000,
      145000,
      160000,
      175000,
      190000
    ],
    "capacityByLevel": [
      250,
      425,
      520,
      670,
      740,
      870,
      1090,
      1225,
      1440,
      1680
    ],
    "repairTimeByLevel": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900,
      1000
    ]
  },
  "16": {
    "code": 16,
    "yardType": "main",
    "category": "special",
    "quantityByTownHall": [
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "costs": [
      {
        "r1": 4000000,
        "r2": 4000000,
        "r3": 4000000,
        "r4": 0,
        "time": 90000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          },
          {
            "typeCode": 13,
            "count": 3,
            "minLevel": 2
          }
        ]
      }
    ],
    "hpByLevel": [
      64000
    ],
    "repairTimeByLevel": [
      300
    ]
  },
  "17": {
    "code": 17,
    "yardType": "main",
    "category": "wall",
    "quantityByTownHall": [
      0,
      0,
      30,
      60,
      120,
      200,
      220,
      280,
      300,
      340,
      400
    ],
    "costs": [
      {
        "r1": 1000,
        "r2": 0,
        "r3": 0,
        "r4": 0,
        "time": 5,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 0,
        "r2": 10000,
        "r3": 0,
        "r4": 0,
        "time": 5,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 100000,
        "r2": 100000,
        "r3": 0,
        "r4": 0,
        "time": 5,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 200000,
        "r2": 200000,
        "r3": 0,
        "r4": 0,
        "time": 5,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          }
        ]
      },
      {
        "r1": 400000,
        "r2": 400000,
        "r3": 0,
        "r4": 0,
        "time": 5,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 6
          }
        ]
      }
    ],
    "hpByLevel": [
      1000,
      2300,
      5750,
      18000,
      27000
    ],
    "repairTimeByLevel": [
      5,
      5,
      5,
      5,
      5
    ]
  },
  "18": {
    "code": 18,
    "yardType": "main",
    "category": "wall",
    "quantityByTownHall": [
      0,
      0,
      10,
      20,
      40,
      60,
      70,
      90,
      90,
      90,
      90
    ],
    "costs": [
      {
        "r1": 0,
        "r2": 2000,
        "r3": 0,
        "r4": 0,
        "time": 5,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      }
    ],
    "hpByLevel": [
      3600
    ],
    "repairTimeByLevel": [
      20
    ]
  },
  "19": {
    "code": 19,
    "yardType": "main",
    "category": "special",
    "quantityByTownHall": [
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "costs": [
      {
        "r1": 25000,
        "r2": 25000,
        "r3": 15000,
        "r4": 0,
        "time": 18000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 1000000,
        "r2": 1000000,
        "r3": 500000,
        "r4": 0,
        "time": 36000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 2000000,
        "r2": 2000000,
        "r3": 1000000,
        "r4": 0,
        "time": 72000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 4000000,
        "r2": 4000000,
        "r3": 2000000,
        "r4": 0,
        "time": 144000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 6000000,
        "r2": 6000000,
        "r3": 4000000,
        "r4": 0,
        "time": 288000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 6
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 10000000,
        "r2": 10000000,
        "r3": 6000000,
        "r4": 0,
        "time": 576000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 7
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 16000000,
        "r2": 16000000,
        "r3": 10000000,
        "r4": 0,
        "time": 1152000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 8
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 4
          }
        ]
      }
    ],
    "hpByLevel": [
      1000,
      1500,
      2250,
      3375,
      5000,
      7500,
      12000
    ],
    "capacityByLevel": [
      600,
      900,
      1200,
      1500,
      2100,
      3200,
      4800
    ],
    "produceByLevel": [
      2,
      2,
      2,
      2,
      2,
      2,
      2
    ],
    "repairTimeByLevel": [
      120,
      240,
      480,
      960,
      1920,
      3840,
      7680
    ]
  },
  "20": {
    "code": 20,
    "yardType": "main",
    "category": "tower",
    "quantityByTownHall": [
      0,
      2,
      3,
      4,
      5,
      6,
      6,
      6,
      6,
      6,
      6
    ],
    "costs": [
      {
        "r1": 2000,
        "r2": 1500,
        "r3": 500,
        "r4": 0,
        "time": 30,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 10000,
        "r2": 7500,
        "r3": 2500,
        "r4": 0,
        "time": 900,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 50000,
        "r2": 37500,
        "r3": 12500,
        "r4": 0,
        "time": 2700,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 250000,
        "r2": 187500,
        "r3": 62500,
        "r4": 0,
        "time": 8100,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 1250000,
        "r2": 937500,
        "r3": 312500,
        "r4": 0,
        "time": 24300,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 6250000,
        "r2": 4687500,
        "r3": 1562500,
        "r4": 0,
        "time": 72900,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          }
        ]
      },
      {
        "r1": 9375000,
        "r2": 7000000,
        "r3": 1562500,
        "r4": 0,
        "time": 172800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 6
          }
        ]
      },
      {
        "r1": 14000000,
        "r2": 10500000,
        "r3": 1562500,
        "r4": 0,
        "time": 259200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 7
          }
        ]
      },
      {
        "r1": 21000000,
        "r2": 15800000,
        "r3": 1562500,
        "r4": 0,
        "time": 345600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 8
          }
        ]
      },
      {
        "r1": 31600000,
        "r2": 23700000,
        "r3": 1562500,
        "r4": 0,
        "time": 475200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 8
          }
        ]
      }
    ],
    "hpByLevel": [
      6000,
      9000,
      12600,
      17640,
      26460,
      34400,
      45000,
      58000,
      75500,
      98200
    ],
    "repairTimeByLevel": [
      360,
      720,
      1440,
      2880,
      5760,
      11520,
      23000,
      46000,
      64800,
      86400
    ]
  },
  "21": {
    "code": 21,
    "yardType": "main",
    "category": "tower",
    "quantityByTownHall": [
      0,
      2,
      3,
      4,
      5,
      6,
      6,
      6,
      6,
      6,
      6
    ],
    "costs": [
      {
        "r1": 1500,
        "r2": 2000,
        "r3": 500,
        "r4": 0,
        "time": 30,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 7500,
        "r2": 10000,
        "r3": 2500,
        "r4": 0,
        "time": 900,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 37500,
        "r2": 50000,
        "r3": 12500,
        "r4": 0,
        "time": 2700,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 187500,
        "r2": 250000,
        "r3": 62500,
        "r4": 0,
        "time": 18000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 937500,
        "r2": 1250000,
        "r3": 312500,
        "r4": 0,
        "time": 43200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          }
        ]
      },
      {
        "r1": 4687500,
        "r2": 6250000,
        "r3": 1562500,
        "r4": 0,
        "time": 86400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 6
          }
        ]
      },
      {
        "r1": 7031250,
        "r2": 9375000,
        "r3": 2343750,
        "r4": 0,
        "time": 172800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 7
          }
        ]
      },
      {
        "r1": 10547000,
        "r2": 14062000,
        "r3": 3515000,
        "r4": 0,
        "time": 259200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 8
          }
        ]
      },
      {
        "r1": 15820000,
        "r2": 21095000,
        "r3": 5275000,
        "r4": 0,
        "time": 345600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 8
          }
        ]
      },
      {
        "r1": 32730000,
        "r2": 31650000,
        "r3": 7900000,
        "r4": 0,
        "time": 475200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 8
          }
        ]
      }
    ],
    "hpByLevel": [
      6000,
      9000,
      12600,
      17640,
      26460,
      34400,
      45000,
      58000,
      75500,
      98200
    ],
    "repairTimeByLevel": [
      360,
      720,
      1440,
      2880,
      5760,
      11520,
      23000,
      46000,
      64800,
      86400
    ]
  },
  "22": {
    "code": 22,
    "yardType": "main",
    "category": "tower",
    "quantityByTownHall": [
      0,
      0,
      0,
      1,
      1,
      2,
      2,
      3,
      4,
      4,
      4
    ],
    "costs": [
      {
        "r1": 250000,
        "r2": 187500,
        "r3": 62500,
        "r4": 0,
        "time": 21600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          },
          {
            "typeCode": 15,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 1000000,
        "r2": 1000000,
        "r3": 500000,
        "r4": 0,
        "time": 43200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          },
          {
            "typeCode": 15,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 2000000,
        "r2": 2000000,
        "r3": 1000000,
        "r4": 0,
        "time": 86400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          },
          {
            "typeCode": 15,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 4000000,
        "r2": 4000000,
        "r3": 2000000,
        "r4": 0,
        "time": 172800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 9
          },
          {
            "typeCode": 15,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 8000000,
        "r2": 8000000,
        "r3": 4000000,
        "r4": 0,
        "time": 345600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 10
          },
          {
            "typeCode": 15,
            "count": 1,
            "minLevel": 3
          }
        ]
      }
    ],
    "hpByLevel": [
      10000,
      24500,
      52000,
      75000,
      105000
    ],
    "capacityByLevel": [
      190,
      225,
      270,
      330,
      400
    ],
    "repairTimeByLevel": [
      120,
      240,
      480,
      960,
      1920
    ]
  },
  "23": {
    "code": 23,
    "yardType": "main",
    "category": "tower",
    "quantityByTownHall": [
      0,
      0,
      0,
      0,
      1,
      2,
      3,
      3,
      3,
      3,
      3
    ],
    "costs": [
      {
        "r1": 500000,
        "r2": 250000,
        "r3": 100000,
        "r4": 0,
        "time": 18000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 1000000,
        "r2": 500000,
        "r3": 200000,
        "r4": 0,
        "time": 86400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          }
        ]
      },
      {
        "r1": 2000000,
        "r2": 1000000,
        "r3": 400000,
        "r4": 0,
        "time": 172800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 6
          }
        ]
      },
      {
        "r1": 4000000,
        "r2": 2000000,
        "r3": 800000,
        "r4": 0,
        "time": 259200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 7
          }
        ]
      },
      {
        "r1": 8000000,
        "r2": 4000000,
        "r3": 1600000,
        "r4": 0,
        "time": 388800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 8
          }
        ]
      },
      {
        "r1": 16000000,
        "r2": 8000000,
        "r3": 3200000,
        "r4": 0,
        "time": 777600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 9
          }
        ]
      },
      {
        "r1": 24000000,
        "r2": 16000000,
        "r3": 6400000,
        "r4": 0,
        "time": 1036800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 10
          }
        ]
      },
      {
        "r1": 27000000,
        "r2": 25000000,
        "r3": 12800000,
        "r4": 0,
        "time": 1209600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 10
          }
        ]
      }
    ],
    "hpByLevel": [
      9000,
      12600,
      17640,
      26460,
      34400,
      42200,
      50000,
      58000
    ],
    "repairTimeByLevel": [
      1440,
      2880,
      5760,
      11520,
      23000,
      46000,
      92000,
      184000
    ]
  },
  "24": {
    "code": 24,
    "yardType": "main",
    "category": "trap",
    "quantityByTownHall": [
      0,
      0,
      8,
      15,
      20,
      28,
      35,
      42,
      50,
      60,
      75
    ],
    "costs": [
      {
        "r1": 1000,
        "r2": 1000,
        "r3": 1000,
        "r4": 0,
        "time": 5,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 2
          }
        ]
      }
    ],
    "hpByLevel": [
      10
    ],
    "repairTimeByLevel": [
      1
    ]
  },
  "25": {
    "code": 25,
    "yardType": "main",
    "category": "tower",
    "quantityByTownHall": [
      0,
      0,
      0,
      0,
      1,
      2,
      3,
      3,
      3,
      3,
      3
    ],
    "costs": [
      {
        "r1": 187500,
        "r2": 250000,
        "r3": 62500,
        "r4": 0,
        "time": 18000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 750000,
        "r2": 1000000,
        "r3": 250000,
        "r4": 0,
        "time": 86400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          }
        ]
      },
      {
        "r1": 2250000,
        "r2": 3000000,
        "r3": 750000,
        "r4": 0,
        "time": 172800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 6
          }
        ]
      },
      {
        "r1": 5250000,
        "r2": 5000000,
        "r3": 1250000,
        "r4": 0,
        "time": 345600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 7
          }
        ]
      },
      {
        "r1": 12000000,
        "r2": 10000000,
        "r3": 2000000,
        "r4": 0,
        "time": 518400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 7
          }
        ]
      },
      {
        "r1": 18000000,
        "r2": 15000000,
        "r3": 5000000,
        "r4": 0,
        "time": 691200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 9
          }
        ]
      },
      {
        "r1": 24000000,
        "r2": 20000000,
        "r3": 6500000,
        "r4": 0,
        "time": 864000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 10
          }
        ]
      },
      {
        "r1": 30000000,
        "r2": 25000000,
        "r3": 7800000,
        "r4": 0,
        "time": 1209600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 10
          }
        ]
      }
    ],
    "hpByLevel": [
      15000,
      22000,
      30000,
      48000,
      60000,
      72000,
      82000,
      90000
    ],
    "repairTimeByLevel": [
      1920,
      3840,
      7680,
      9260,
      12000,
      18000,
      24000,
      30000
    ]
  },
  "26": {
    "code": 26,
    "yardType": "main",
    "category": "special",
    "quantityByTownHall": [
      0,
      0,
      0,
      1,
      1,
      2,
      2,
      2,
      2,
      2,
      2
    ],
    "costs": [
      {
        "r1": 100000,
        "r2": 100000,
        "r3": 0,
        "r4": 0,
        "time": 10800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 2
          }
        ]
      },
      {
        "r1": 250000,
        "r2": 250000,
        "r3": 0,
        "r4": 0,
        "time": 21600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 400000,
        "r2": 400000,
        "r3": 0,
        "r4": 0,
        "time": 43200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 3
          }
        ]
      },
      {
        "r1": 600000,
        "r2": 600000,
        "r3": 0,
        "r4": 0,
        "time": 86400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 6
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 900000,
        "r2": 900000,
        "r3": 0,
        "r4": 0,
        "time": 86400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 7
          },
          {
            "typeCode": 8,
            "count": 1,
            "minLevel": 4
          }
        ]
      }
    ],
    "hpByLevel": [
      6000,
      10000,
      14000,
      20000,
      30000
    ],
    "repairTimeByLevel": [
      3800,
      7680,
      10640,
      15600,
      22800
    ]
  },
  "27": {
    "code": 27,
    "yardType": "main",
    "category": "enemy",
    "quantityByTownHall": [
      1
    ],
    "costs": [
      {
        "r1": 0,
        "r2": 0,
        "r3": 0,
        "r4": 0,
        "time": 5,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      }
    ],
    "hpByLevel": [
      1
    ],
    "repairTimeByLevel": [
      1
    ]
  },
  "51": {
    "code": 51,
    "yardType": "main",
    "category": "special",
    "quantityByTownHall": [
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "costs": [
      {
        "r1": 75000,
        "r2": 75000,
        "r3": 75000,
        "r4": 0,
        "time": 5400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 3
          },
          {
            "typeCode": 5,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 128600,
        "r2": 128600,
        "r3": 128600,
        "r4": 0,
        "time": 10800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          },
          {
            "typeCode": 5,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 257200,
        "r2": 257200,
        "r3": 257200,
        "r4": 0,
        "time": 21600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          },
          {
            "typeCode": 5,
            "count": 1,
            "minLevel": 1
          }
        ]
      },
      {
        "r1": 514400,
        "r2": 514400,
        "r3": 514400,
        "r4": 0,
        "time": 43200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 6
          },
          {
            "typeCode": 5,
            "count": 1,
            "minLevel": 1
          }
        ]
      }
    ],
    "hpByLevel": [
      4000,
      8000,
      16000,
      32000
    ],
    "repairTimeByLevel": [
      120,
      240,
      480,
      960
    ]
  },
  "52": {
    "code": 52,
    "yardType": "main",
    "category": "taunt",
    "quantityByTownHall": [
      0
    ],
    "costs": [
      {
        "r1": 100000,
        "r2": 100000,
        "r3": 100000,
        "r4": 100000,
        "time": 0,
        "requirements": []
      }
    ],
    "hpByLevel": [
      100
    ],
    "repairTimeByLevel": [
      1
    ]
  },
  "112": {
    "code": 112,
    "yardType": "main",
    "category": "special",
    "quantityByTownHall": [
      0
    ],
    "costs": []
  },
  "113": {
    "code": 113,
    "yardType": "main",
    "category": "special",
    "quantityByTownHall": [
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "costs": [
      {
        "r1": 2000,
        "r2": 2000,
        "r3": 2000,
        "r4": 0,
        "time": 300,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 1
          }
        ]
      }
    ],
    "hpByLevel": [
      3400
    ],
    "repairTimeByLevel": [
      240
    ]
  },
  "115": {
    "code": 115,
    "yardType": "main",
    "category": "tower",
    "quantityByTownHall": [
      0,
      0,
      0,
      0,
      1,
      2,
      2,
      2,
      2,
      2,
      2
    ],
    "costs": [
      {
        "r1": 215000,
        "r2": 280000,
        "r3": 62500,
        "r4": 0,
        "time": 18000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      },
      {
        "r1": 850000,
        "r2": 1200000,
        "r3": 250000,
        "r4": 0,
        "time": 86400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          }
        ]
      },
      {
        "r1": 2750000,
        "r2": 3400000,
        "r3": 750000,
        "r4": 0,
        "time": 172800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 6
          }
        ]
      },
      {
        "r1": 5750000,
        "r2": 5200000,
        "r3": 1250000,
        "r4": 0,
        "time": 345600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 7
          }
        ]
      },
      {
        "r1": 13500000,
        "r2": 11000000,
        "r3": 2000000,
        "r4": 0,
        "time": 518400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 7
          }
        ]
      },
      {
        "r1": 16000000,
        "r2": 14000000,
        "r3": 4000000,
        "r4": 0,
        "time": 691200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 9
          }
        ]
      },
      {
        "r1": 19200000,
        "r2": 16800000,
        "r3": 8000000,
        "r4": 0,
        "time": 864000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 10
          }
        ]
      },
      {
        "r1": 23040000,
        "r2": 21000000,
        "r3": 16000000,
        "r4": 0,
        "time": 1209600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 10
          }
        ]
      }
    ],
    "hpByLevel": [
      15000,
      22000,
      30000,
      48000,
      60000,
      72000,
      82000,
      90000
    ],
    "repairTimeByLevel": [
      1920,
      3840,
      7680,
      9260,
      12000,
      18000,
      24000,
      30000
    ]
  },
  "117": {
    "code": 117,
    "yardType": "main",
    "category": "trap",
    "quantityByTownHall": [
      0,
      0,
      0,
      0,
      4,
      6,
      8,
      10,
      12,
      15,
      18
    ],
    "costs": [
      {
        "r1": 50000,
        "r2": 50000,
        "r3": 50000,
        "r4": 0,
        "time": 5,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 4
          }
        ]
      }
    ],
    "hpByLevel": [
      10
    ],
    "repairTimeByLevel": [
      1
    ]
  },
  "118": {
    "code": 118,
    "yardType": "main",
    "category": "tower",
    "quantityByTownHall": [
      0,
      0,
      0,
      0,
      0,
      2,
      3,
      3,
      3,
      3,
      3
    ],
    "costs": [
      {
        "r1": 2000000,
        "r2": 2400000,
        "r3": 1600000,
        "r4": 0,
        "time": 43200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 5
          }
        ]
      },
      {
        "r1": 3600000,
        "r2": 4320000,
        "r3": 2880000,
        "r4": 0,
        "time": 86400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 6
          }
        ]
      },
      {
        "r1": 6480000,
        "r2": 7776000,
        "r3": 5184000,
        "r4": 0,
        "time": 172800,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 7
          }
        ]
      },
      {
        "r1": 11664000,
        "r2": 13996800,
        "r3": 9331200,
        "r4": 0,
        "time": 345600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 7
          }
        ]
      },
      {
        "r1": 16995200,
        "r2": 18194240,
        "r3": 16796160,
        "r4": 0,
        "time": 518400,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 8
          }
        ]
      },
      {
        "r1": 20220000,
        "r2": 24202000,
        "r3": 19000000,
        "r4": 0,
        "time": 691200,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 9
          }
        ]
      },
      {
        "r1": 25000000,
        "r2": 25000000,
        "r3": 22000000,
        "r4": 0,
        "time": 864000,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 10
          }
        ]
      },
      {
        "r1": 27000000,
        "r2": 27000000,
        "r3": 26500000,
        "r4": 0,
        "time": 1209600,
        "requirements": [
          {
            "typeCode": 14,
            "count": 1,
            "minLevel": 10
          }
        ]
      }
    ],
    "hpByLevel": [
      17640,
      34400,
      45000,
      58000,
      75500,
      90000,
      100000,
      110000
    ],
    "repairTimeByLevel": [
      2880,
      5760,
      11520,
      23000,
      46000,
      69000,
      103500,
      155250
    ]
  }
};
