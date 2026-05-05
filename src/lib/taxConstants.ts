import type { TaxConstants } from '@/types/payroll'

export const TAX_CONSTANTS_2026: TaxConstants = {
  CPP1_RATE:            0.0595,
  CPP1_BASIC_EXEMPTION: 3500,
  CPP1_MAX_PENSIONABLE: 74600,
  CPP1_MAX_EMPLOYEE:    4230.45,
  CPP2_RATE:            0.0400,
  CPP2_CEILING:         85000,
  CPP2_MAX_EMPLOYEE:    416.00,

  EI_EMPLOYEE_RATE:  0.0163,
  EI_EMPLOYER_MULT:  1.4,
  EI_MAX_INSURABLE:  68900,
  EI_MAX_EMPLOYEE:   1123.07,

  FED_BASIC_PERSONAL: 16452,
  FED_CREDIT_RATE:    0.14,
  FED_BRACKETS: [
    { min: 0,       max: 58523,   rate: 0.14  },
    { min: 58523,   max: 117045,  rate: 0.205 },
    { min: 117045,  max: 181440,  rate: 0.26  },
    { min: 181440,  max: 258482,  rate: 0.29  },
    { min: 258482,  max: Infinity, rate: 0.33 },
  ],

  ON_BASIC_PERSONAL:    12989,
  ON_CREDIT_RATE:       0.0505,
  ON_SURTAX1_THRESHOLD: 5554,
  ON_SURTAX1_RATE:      0.20,
  ON_SURTAX2_THRESHOLD: 7108,
  ON_SURTAX2_RATE:      0.36,
  ON_BRACKETS: [
    { min: 0,       max: 53891,   rate: 0.0505 },
    { min: 53891,   max: 107785,  rate: 0.0915 },
    { min: 107785,  max: 150000,  rate: 0.1116 },
    { min: 150000,  max: 220000,  rate: 0.1216 },
    { min: 220000,  max: Infinity, rate: 0.1316 },
  ],

  AB_BASIC_PERSONAL: 22769,
  AB_CREDIT_RATE:    0.08,
  AB_BRACKETS: [
    { min: 0,       max: 151234,  rate: 0.10 },
    { min: 151234,  max: 181475,  rate: 0.12 },
    { min: 181475,  max: 241975,  rate: 0.13 },
    { min: 241975,  max: 362962,  rate: 0.14 },
    { min: 362962,  max: Infinity, rate: 0.15 },
  ],

  BC_BASIC_PERSONAL: 13217,
  BC_CREDIT_RATE:    0.0560,
  BC_BRACKETS: [
    { min: 0,       max: 50363,   rate: 0.0560 },
    { min: 50363,   max: 100728,  rate: 0.0770 },
    { min: 100728,  max: 115648,  rate: 0.1050 },
    { min: 115648,  max: 140180,  rate: 0.1229 },
    { min: 140180,  max: 190252,  rate: 0.1470 },
    { min: 190252,  max: 265354,  rate: 0.1680 },
    { min: 265354,  max: Infinity, rate: 0.2050 },
  ],
}
