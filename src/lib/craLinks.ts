// Official CRA form page URLs — these link to the form landing pages
// where users can download the current year's fillable PDF.
// We link to the page (not the PDF directly) because CRA updates the
// PDF URL each year but the page URL stays stable.

export const CRA_FORM_LINKS = {
  T4: {
    formPage:    'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t4.html',
    guidePage:   'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc4120/employers-guide-filing-t4-slip-summary.html',
    webForms:    'https://www.canada.ca/en/revenue-agency/services/e-services/filing-information-returns-electronically-t4-t5-other-types-returns-overview/filing-information-returns-electronically-t4-t5-other-types-returns-file/filing-web-forms.html',
    label:       'T4 — Statement of Remuneration Paid',
  },
  T4A: {
    formPage:    'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t4a.html',
    guidePage:   'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/completing-slips-summaries/t4a-information-payers.html',
    webForms:    'https://www.canada.ca/en/revenue-agency/services/e-services/filing-information-returns-electronically-t4-t5-other-types-returns-overview/filing-information-returns-electronically-t4-t5-other-types-returns-file/filing-web-forms.html',
    label:       'T4A — Statement of Pension, Retirement, Annuity & Other Income',
  },
  T5: {
    formPage:    'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t5.html',
    guidePage:   'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/completing-slips-summaries/financial-slips-summaries/return-investment-income-t5/t5-slip.html',
    webForms:    'https://www.canada.ca/en/revenue-agency/services/e-services/filing-information-returns-electronically-t4-t5-other-types-returns-overview/filing-information-returns-electronically-t4-t5-other-types-returns-file/filing-web-forms.html',
    label:       'T5 — Statement of Investment Income',
  },
  ROE: {
    formPage:    'https://www.canada.ca/en/employment-social-development/services/my-account.html',
    guidePage:   'https://www.canada.ca/en/employment-social-development/programs/ei/ei-list/ei-employers/roe-how.html',
    webForms:    'https://www.canada.ca/en/employment-social-development/services/my-account.html',
    label:       'ROE — Record of Employment',
  },
  T4SUM: {
    formPage:    'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t4sum.html',
    guidePage:   'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc4120/employers-guide-filing-t4-slip-summary.html',
    webForms:    'https://www.canada.ca/en/revenue-agency/services/e-services/filing-information-returns-electronically-t4-t5-other-types-returns-overview/filing-information-returns-electronically-t4-t5-other-types-returns-file/filing-web-forms.html',
    label:       'T4SUM — Summary of Remuneration Paid',
  },
}

export type CRAFormKey = keyof typeof CRA_FORM_LINKS
