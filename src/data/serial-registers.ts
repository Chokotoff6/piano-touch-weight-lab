/**
 * Registre de datation post-1950 par numéro de série (dictionnaire de l'atelier).
 * Paliers strictement croissants sur max_sn : un numéro ≤ max_sn correspond à l'année indiquée.
 * Clé = marque normalisée (majuscules, séparateurs → "_").
 */
export type SerialStep = { max_sn: number; year: number };

export const PRODUCTION_YEAR_CHART: { manufacturers: Record<string, SerialStep[]> } = {
  manufacturers: {
    "BALDWIN": [
      {
        "max_sn": 115000,
        "year": 1950
      },
      {
        "max_sn": 245000,
        "year": 1980
      },
      {
        "max_sn": 390000,
        "year": 2000
      },
      {
        "max_sn": 450000,
        "year": 2026
      }
    ],
    "BALDWIN_WURLITZER": [
      {
        "max_sn": 500000,
        "year": 1980
      },
      {
        "max_sn": 999999,
        "year": 2010
      }
    ],
    "BLÜTHNER": [
      {
        "max_sn": 132000,
        "year": 1960
      },
      {
        "max_sn": 145000,
        "year": 1980
      },
      {
        "max_sn": 151000,
        "year": 2000
      },
      {
        "max_sn": 155000,
        "year": 2026
      }
    ],
    "BOSTON": [
      {
        "max_sn": 100000,
        "year": 1992
      },
      {
        "max_sn": 150000,
        "year": 2005
      },
      {
        "max_sn": 195000,
        "year": 2026
      }
    ],
    "BÖSENDORFER": [
      {
        "max_sn": 26879,
        "year": 1950
      },
      {
        "max_sn": 33444,
        "year": 1980
      },
      {
        "max_sn": 45150,
        "year": 2000
      },
      {
        "max_sn": 49594,
        "year": 2012
      },
      {
        "max_sn": 52000,
        "year": 2026
      }
    ],
    "C_BECHSTEIN": [
      {
        "max_sn": 145000,
        "year": 1950
      },
      {
        "max_sn": 170000,
        "year": 1980
      },
      {
        "max_sn": 190000,
        "year": 2000
      },
      {
        "max_sn": 215000,
        "year": 2026
      }
    ],
    "C_BECHSTEIN_W_HOFFMANN": [
      {
        "max_sn": 150000,
        "year": 1990
      },
      {
        "max_sn": 220000,
        "year": 2026
      }
    ],
    "ESSEX": [
      {
        "max_sn": 100000,
        "year": 2001
      },
      {
        "max_sn": 160000,
        "year": 2026
      }
    ],
    "FAZIOLI": [
      {
        "max_sn": 500,
        "year": 1985
      },
      {
        "max_sn": 1200,
        "year": 2000
      },
      {
        "max_sn": 3200,
        "year": 2026
      }
    ],
    "FEURICH": [
      {
        "max_sn": 51000,
        "year": 1950
      },
      {
        "max_sn": 72000,
        "year": 1975
      },
      {
        "max_sn": 81000,
        "year": 2000
      },
      {
        "max_sn": 92000,
        "year": 2026
      }
    ],
    "GROTRIAN_STEINWEG": [
      {
        "max_sn": 35000,
        "year": 1950
      },
      {
        "max_sn": 47000,
        "year": 1980
      },
      {
        "max_sn": 56000,
        "year": 2000
      },
      {
        "max_sn": 63800,
        "year": 2026
      }
    ],
    "HAILUN": [
      {
        "max_sn": 50000,
        "year": 2005
      },
      {
        "max_sn": 180000,
        "year": 2026
      }
    ],
    "KAWAI": [
      {
        "max_sn": 120000,
        "year": 1965
      },
      {
        "max_sn": 500000,
        "year": 1972
      },
      {
        "max_sn": 2500000,
        "year": 2000
      },
      {
        "max_sn": 2850000,
        "year": 2026
      }
    ],
    "PEARL_RIVER": [
      {
        "max_sn": 200000,
        "year": 1995
      },
      {
        "max_sn": 1500000,
        "year": 2026
      }
    ],
    "PETROF": [
      {
        "max_sn": 219222,
        "year": 1961
      },
      {
        "max_sn": 219437,
        "year": 1962
      },
      {
        "max_sn": 219702,
        "year": 1963
      },
      {
        "max_sn": 450000,
        "year": 2000
      },
      {
        "max_sn": 630000,
        "year": 2026
      }
    ],
    "PLEYEL": [
      {
        "max_sn": 219222,
        "year": 1961
      },
      {
        "max_sn": 219437,
        "year": 1962
      },
      {
        "max_sn": 219702,
        "year": 1963
      },
      {
        "max_sn": 260000,
        "year": 2013
      }
    ],
    "RITMÜLLER": [
      {
        "max_sn": 50000,
        "year": 2000
      },
      {
        "max_sn": 350000,
        "year": 2026
      }
    ],
    "SAMICK": [
      {
        "max_sn": 180000,
        "year": 1996
      },
      {
        "max_sn": 210000,
        "year": 1997
      },
      {
        "max_sn": 240000,
        "year": 1998
      },
      {
        "max_sn": 270000,
        "year": 1999
      },
      {
        "max_sn": 300000,
        "year": 2000
      },
      {
        "max_sn": 550000,
        "year": 2026
      }
    ],
    "SAUTER": [
      {
        "max_sn": 18000,
        "year": 1950
      },
      {
        "max_sn": 70000,
        "year": 1980
      },
      {
        "max_sn": 110000,
        "year": 2010
      },
      {
        "max_sn": 120000,
        "year": 2026
      }
    ],
    "SCHIMMEL": [
      {
        "max_sn": 211000,
        "year": 1972
      },
      {
        "max_sn": 211036,
        "year": 1974
      },
      {
        "max_sn": 211134,
        "year": 1979
      },
      {
        "max_sn": 211255,
        "year": 1983
      },
      {
        "max_sn": 219550,
        "year": 1985
      },
      {
        "max_sn": 350000,
        "year": 2026
      }
    ],
    "SEILER": [
      {
        "max_sn": 70000,
        "year": 1955
      },
      {
        "max_sn": 120000,
        "year": 1980
      },
      {
        "max_sn": 180000,
        "year": 2026
      }
    ],
    "STEINGRAEBER_SÖHNE": [
      {
        "max_sn": 25000,
        "year": 1960
      },
      {
        "max_sn": 40000,
        "year": 1990
      },
      {
        "max_sn": 48000,
        "year": 2026
      }
    ],
    "STEINWAY_SONS": [
      {
        "max_sn": 331000,
        "year": 1950
      },
      {
        "max_sn": 470000,
        "year": 1980
      },
      {
        "max_sn": 554000,
        "year": 2000
      },
      {
        "max_sn": 595000,
        "year": 2012
      },
      {
        "max_sn": 625000,
        "year": 2026
      }
    ],
    "W_HOFFMANN": [
      {
        "max_sn": 45000,
        "year": 1975
      },
      {
        "max_sn": 110000,
        "year": 2026
      }
    ],
    "WURLITZER": [
      {
        "max_sn": 400000,
        "year": 1950
      },
      {
        "max_sn": 2200000,
        "year": 2000
      }
    ],
    "YAMAHA": [
      {
        "max_sn": 42073,
        "year": 1950
      },
      {
        "max_sn": 101000,
        "year": 1974
      },
      {
        "max_sn": 132000,
        "year": 1980
      },
      {
        "max_sn": 1700559,
        "year": 2000
      },
      {
        "max_sn": 2422310,
        "year": 2007
      },
      {
        "max_sn": 7000000,
        "year": 2026
      }
    ],
    "YOUNG_CHANG": [
      {
        "max_sn": 78000,
        "year": 1978
      },
      {
        "max_sn": 1300000,
        "year": 1988
      },
      {
        "max_sn": 2000000,
        "year": 2000
      },
      {
        "max_sn": 2700000,
        "year": 2007
      }
    ],
    "ZIMMERMANN": [
      {
        "max_sn": 150000,
        "year": 1960
      },
      {
        "max_sn": 450000,
        "year": 1990
      },
      {
        "max_sn": 520000,
        "year": 2026
      }
    ]
  },
};

/** Registres Yamaha par usine (réservés aux règles avancées par site de fabrication). */
export const YAMAHA_REGISTERS: Record<string, SerialStep[]> = {
  "Hamamatsu_Japon": [
    {
      "max_sn": 42073,
      "year": 1950
    },
    {
      "max_sn": 101000,
      "year": 1974
    },
    {
      "max_sn": 132000,
      "year": 1980
    },
    {
      "max_sn": 1700559,
      "year": 2000
    },
    {
      "max_sn": 2422310,
      "year": 2007
    },
    {
      "max_sn": 7000000,
      "year": 2026
    }
  ],
  "Thomaston_USA": [
    {
      "max_sn": 500101,
      "year": 1983
    },
    {
      "max_sn": 504050,
      "year": 1986
    },
    {
      "max_sn": 100001,
      "year": 1986
    },
    {
      "max_sn": 304000,
      "year": 2005
    }
  ],
  "South_Haven_USA": [
    {
      "max_sn": 101000,
      "year": 1974
    },
    {
      "max_sn": 186000,
      "year": 1986
    }
  ],
  "Hangzhou_Chine": [
    {
      "max_sn": 4000,
      "year": 2004
    },
    {
      "max_sn": 39900,
      "year": 2008
    },
    {
      "max_sn": 105430,
      "year": 2010
    },
    {
      "max_sn": 411200,
      "year": 2016
    }
  ],
  "Jakarta_Indonesie": [
    {
      "max_sn": 1600001,
      "year": 1999
    },
    {
      "max_sn": 2008354,
      "year": 2003
    },
    {
      "max_sn": 3300000,
      "year": 2016
    }
  ],
  "Taoyuan_Taiwan": [
    {
      "max_sn": 264800,
      "year": 2003
    },
    {
      "max_sn": 285000,
      "year": 2006
    },
    {
      "max_sn": 297000,
      "year": 2009
    }
  ],
  "Kemble_Angleterre": [
    {
      "max_sn": 215156,
      "year": 1986
    },
    {
      "max_sn": 234500,
      "year": 1990
    },
    {
      "max_sn": 339082,
      "year": 2009
    }
  ]
};
