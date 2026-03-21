export const mockQualifications = {
  "Qualifications": [
    {
      "Title": "1/4F",
      "Winners": [
        {
          "Number": 252,
        },
        {
          "Number": 296,
        },
        {
          "Number": 355,
        },
        {
          "Number": 49,
        },
        {
          "Number": 200,
        },
        {
          "Number": 221,
        },
        {
          "Number": 351,
        },
        // {
        //   "Number": 24,
        // },
        // {
        //   "Number": 295,
        // },
        // {
        //   "Number": 51,
        // },
        // {
        //   "Number": 349,
        // },
        {
          "Number": 135,
        },
      ],
      // "Winners": [],
      "Rounds": [
        {
          "Rounds": {
            "1": [
              "24",
              "41",
              "49",
              "51",
              "135",
              "141",
              "161",
              "178",
              "180",
              "185",
              "200",
              "206",
              "221",
            ],
            "2": [
              "227",
              "252",
              "263",
              "272",
              "295",
              "296",
              "349",
              "359",
              "364",
              "370",
            ],
          },
        },
      ],
      // "Rounds": [],
      "_Kolo": 3,
      get "Kolo"() {
        return this["_Kolo"];
      },
      set "Kolo"(value) {
        this["_Kolo"] = value;
      },
    },
    {
      "Title": "1/2F",
      "Winners": [
        {
          "Number": 252,
        },
        {
          "Number": 200,
        },
        // {
        //   "Number": 295,
        // },
        {
          "Number": 221,
        },
        {
          "Number": 355,
        },
        {
          "Number": 296,
        },
      ],
      // "Winners": [],
      "Rounds": [
        {
          "Rounds": {
            "1": ["49", "200", "221", "351"],
            "2": ["135", "249"],
          },
        },
      ],
      // "Rounds": [],
      "Kolo": 2,
    },
    {
      "Title": "F",
      // "Winners": [
      //   {
      //     "Number": 296,
      //   },
      //   {
      //     "Number": 200,
      //   },
      //   {
      //     "Number": 49,
      //   },
      //   {
      //     "Number": 355,
      //   },
      //   {
      //     "Number": 221,
      //   },
      //   {
      //     "Number": 252,
      //   },
      // ],
      "Winners": [],
      "Rounds": [],
      "Kolo": 1,
    },
  ],
};
