import type { Payslip, T4Slip, Employee, Company } from '@/types/database'

// ── Auto-aggregate T4 boxes from payslip history ─────────────
export function aggregateT4FromPayslips(
  payslips: Payslip[],
  employee: Employee,
  company: Company,
  taxYear: number
): Omit<T4Slip, 'id' | 'created_at' | 'updated_at' | 'user_id'> {
  const yearSlips = payslips.filter(p => {
    const y = new Date(p.pay_date).getFullYear()
    return y === taxYear && p.employee_id === employee.id
  })

  const sum = (key: keyof Payslip) =>
    yearSlips.reduce((acc, p) => acc + (Number(p[key]) || 0), 0)

  const grossPay   = sum('gross_pay')
  const cpp1       = sum('cpp1')
  const cpp2       = sum('cpp2')
  const ei         = sum('ei')
  const fedTax     = sum('fed_tax')
  const provTax    = sum('prov_tax')
  const vacPay     = sum('vac_pay')

  // EI insurable = gross pay capped at annual max insurable ($68,900 for 2026)
  const EI_MAX_INSURABLE = 68900
  const eiInsurable = Math.min(grossPay, EI_MAX_INSURABLE)

  // CPP pensionable = gross pay capped at YMPE ($74,600 for 2026)
  const CPP_YMPE = 74600
  const cppPensionable = Math.min(grossPay, CPP_YMPE)

  // Employer CPP = employee CPP1 (1:1 match)
  const employerCPP = cpp1
  // Employer EI = employee EI × 1.4
  const employerEI  = ei * 1.4

  // Union dues from custom deductions
  const unionDues = yearSlips.reduce((acc, p) => {
    const deductions = (p.custom_deductions as { label: string; amount: number }[]) ?? []
    const ud = deductions.filter(d => d.label.toLowerCase().includes('union'))
    return acc + ud.reduce((s, d) => s + d.amount, 0)
  }, 0)

  return {
    company_id:   company.id,
    employee_id:  employee.id,
    tax_year:     taxYear,

    box_14_employment_income:  grossPay - vacPay,  // employment income excl. vac pay
    box_16_cpp_employee:       cpp1,
    box_17_cpp2_employee:      cpp2,
    box_18_ei_premiums:        ei,
    box_22_income_tax:         fedTax + provTax,
    box_24_ei_insurable:       eiInsurable,
    box_26_cpp_pensionable:    cppPensionable,
    box_27_cpp_employer:       employerCPP,
    box_19_ei_employer:        employerEI,

    // Manual boxes — null until user fills them
    box_20_rpp_contributions:    null,
    box_40_other_taxable:        null,
    box_41_other_employment:     null,
    box_42_employment_commissions: null,
    box_44_union_dues:           unionDues > 0 ? unionDues : null,
    box_46_charitable_donations: null,
    box_50_rpp_dpsp_number:      null,
    box_52_pension_adjustment:   null,
    box_53_dpsp_number:          null,
    box_54_sin:                  null,
    box_55_ei_rate:              null,
    box_56_ei_insurable_manual:  null,
    box_57_employment_income_mar: null,
    box_58_employment_income_apr: null,
    box_59_employment_income_may: null,
    box_60_employment_income_jun: null,

    province_of_employment: company.province,
    status:         'draft',
    auto_generated: true,
    notes:          `Auto-generated from ${yearSlips.length} payslip(s) for ${taxYear}`,
  }
}

// ── CRA T4 XML generator ──────────────────────────────────────
// Produces CRA-compliant XML for electronic filing (T619 + T4 slips)
// Spec: https://www.canada.ca/en/revenue-agency/services/e-services/filing-information-returns-electronically-t4-t5-other-types-returns/t4-information-returns.html

export function generateT4XML(
  slips: T4Slip[],
  employees: Employee[],
  company: Company,
  taxYear: number,
  transmitterInfo: {
    transmitterNumber: string   // e.g. MM555555
    transmitterName:   string
    contactName:       string
    contactPhone:      string
    contactEmail:      string
  }
): string {
  const empMap = new Map(employees.map(e => [e.id, e]))
  const now    = new Date()
  void now // timestamp available for future use

  function n(val: number | null | undefined, decimals = 2): string {
    if (val === null || val === undefined || val === 0) return ''
    return val.toFixed(decimals)
  }
  function s(val: string | null | undefined): string {
    return val ?? ''
  }
  function esc(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  const slipXML = slips.map((slip, idx) => {
    const emp = empMap.get(slip.employee_id)
    const empName = emp?.name ?? ''
    const nameParts = empName.trim().split(/\s+/)
    const lastName  = nameParts.slice(1).join(' ') || nameParts[0]
    const firstName = nameParts[0]

    return `
    <T4Slip>
      <EMPE_NM>
        <snm>${esc(lastName)}</snm>
        <gvn_nm>${esc(firstName)}</gvn_nm>
      </EMPE_NM>
      <EMPE_ADDR>
        <addr_l1_txt>${esc(emp?.address ?? '')}</addr_l1_txt>
        <cty_nm></cty_nm>
        <prov_cd>${esc(slip.province_of_employment)}</prov_cd>
        <cntry_cd>CAN</cntry_cd>
        <pstl_cd></pstl_cd>
      </EMPE_ADDR>
      <sin>${esc(s(slip.box_54_sin))}</sin>
      <empe_nbr>${esc(s(emp?.emp_id))}</empe_nbr>
      <rpt_tcd>O</rpt_tcd>
      <EMPR_RPT>
        <bn>${esc(s(company.cra_bn))}</bn>
        <prov_cd>${esc(company.province)}</prov_cd>
      </EMPR_RPT>
      ${n(slip.box_14_employment_income) ? `<empt_incamt>${n(slip.box_14_employment_income)}</empt_incamt>` : ''}
      ${n(slip.box_16_cpp_employee)      ? `<cpp_cntrb_amt>${n(slip.box_16_cpp_employee)}</cpp_cntrb_amt>` : ''}
      ${n(slip.box_17_cpp2_employee)     ? `<cpp2_cntrb_amt>${n(slip.box_17_cpp2_employee)}</cpp2_cntrb_amt>` : ''}
      ${n(slip.box_18_ei_premiums)       ? `<empe_eip_amt>${n(slip.box_18_ei_premiums)}</empe_eip_amt>` : ''}
      ${n(slip.box_22_income_tax)        ? `<itx_ddct_amt>${n(slip.box_22_income_tax)}</itx_ddct_amt>` : ''}
      ${n(slip.box_24_ei_insurable)      ? `<ei_insu_ern_amt>${n(slip.box_24_ei_insurable)}</ei_insu_ern_amt>` : ''}
      ${n(slip.box_26_cpp_pensionable)   ? `<cpp_qpp_ern_amt>${n(slip.box_26_cpp_pensionable)}</cpp_qpp_ern_amt>` : ''}
      ${n(slip.box_20_rpp_contributions) ? `<rpp_cntrb_amt>${n(slip.box_20_rpp_contributions)}</rpp_cntrb_amt>` : ''}
      ${n(slip.box_40_other_taxable)     ? `<othr_txbl_alwn_amt>${n(slip.box_40_other_taxable)}</othr_txbl_alwn_amt>` : ''}
      ${n(slip.box_44_union_dues)        ? `<union_dues_amt>${n(slip.box_44_union_dues)}</union_dues_amt>` : ''}
      ${n(slip.box_46_charitable_donations) ? `<chrty_dons_amt>${n(slip.box_46_charitable_donations)}</chrty_dons_amt>` : ''}
      ${n(slip.box_52_pension_adjustment) ? `<padj_amt>${n(slip.box_52_pension_adjustment)}</padj_amt>` : ''}
      ${s(slip.box_50_rpp_dpsp_number)   ? `<rpp_dpsp_rgst_nbr>${esc(s(slip.box_50_rpp_dpsp_number))}</rpp_dpsp_rgst_nbr>` : ''}
      <T4SlipSeq>${idx + 1}</T4SlipSeq>
    </T4Slip>`
  }).join('\n')

  // T4 Summary totals
  const totals = slips.reduce((acc, s) => ({
    income:  acc.income  + s.box_14_employment_income,
    cpp:     acc.cpp     + s.box_16_cpp_employee,
    cpp2:    acc.cpp2    + s.box_17_cpp2_employee,
    ei:      acc.ei      + s.box_18_ei_premiums,
    tax:     acc.tax     + s.box_22_income_tax,
    empCPP:  acc.empCPP  + s.box_27_cpp_employer,
    empEI:   acc.empEI   + s.box_19_ei_employer,
  }), { income: 0, cpp: 0, cpp2: 0, ei: 0, tax: 0, empCPP: 0, empEI: 0 })

  return `<?xml version="1.0" encoding="UTF-8"?>
<Submission xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <T619>
    <sbmtr_trnmtr_nbr>${esc(transmitterInfo.transmitterNumber)}</sbmtr_trnmtr_nbr>
    <trnmtr_nm>${esc(transmitterInfo.transmitterName)}</trnmtr_nm>
    <trnmtr_type_cd>T</trnmtr_type_cd>
    <summ_cnt>${slips.length}</summ_cnt>
    <lang_cd>E</lang_cd>
    <TRNMTR_ADDR>
      <cntry_cd>CAN</cntry_cd>
    </TRNMTR_ADDR>
    <CNTC>
      <cntc_nm>${esc(transmitterInfo.contactName)}</cntc_nm>
      <cntc_area_cd>${transmitterInfo.contactPhone.replace(/\D/g,'').substring(0,3)}</cntc_area_cd>
      <cntc_phn_nbr>${transmitterInfo.contactPhone.replace(/\D/g,'').substring(3,10)}</cntc_phn_nbr>
      <cntc_email_area>${esc(transmitterInfo.contactEmail)}</cntc_email_area>
    </CNTC>
  </T619>
  <Return>
    <T4Return>
      <rtrn_type>O</rtrn_type>
      <EMPR_NM>
        <l1_nm>${esc(company.name)}</l1_nm>
      </EMPR_NM>
      <EMPR_ADDR>
        <addr_l1_txt>${esc(company.street)}</addr_l1_txt>
        <cty_nm>${esc(company.city)}</cty_nm>
        <prov_cd>${esc(company.province)}</prov_cd>
        <cntry_cd>CAN</cntry_cd>
        <pstl_cd>${esc(company.postal.replace(/\s/g,''))}</pstl_cd>
      </EMPR_ADDR>
      <bn>${esc(s(company.cra_bn))}</bn>
      <tx_yr>${taxYear}</tx_yr>
      <slp_cnt>${slips.length}</slp_cnt>
      <rpt_tcd>O</rpt_tcd>
      <EMPR_CNTC>
        <cntc_nm>${esc(transmitterInfo.contactName)}</cntc_nm>
        <cntc_area_cd>${transmitterInfo.contactPhone.replace(/\D/g,'').substring(0,3)}</cntc_area_cd>
        <cntc_phn_nbr>${transmitterInfo.contactPhone.replace(/\D/g,'').substring(3,10)}</cntc_phn_nbr>
      </EMPR_CNTC>
      ${slipXML}
      <T4Summary>
        <empt_incamt>${totals.income.toFixed(2)}</empt_incamt>
        <cpp_cntrb_amt>${totals.cpp.toFixed(2)}</cpp_cntrb_amt>
        <cpp2_cntrb_amt>${totals.cpp2.toFixed(2)}</cpp2_cntrb_amt>
        <empe_eip_amt>${totals.ei.toFixed(2)}</empe_eip_amt>
        <itx_ddct_amt>${totals.tax.toFixed(2)}</itx_ddct_amt>
        <cpp_cntrb_amt_empr>${totals.empCPP.toFixed(2)}</cpp_cntrb_amt_empr>
        <empr_eip_amt>${totals.empEI.toFixed(2)}</empr_eip_amt>
        <tot_empe_cnt>${slips.length}</tot_empe_cnt>
      </T4Summary>
    </T4Return>
  </Return>
</Submission>`
}

// ── T4 PDF layout data (for jsPDF rendering) ─────────────────
export interface T4PDFData {
  slip: T4Slip
  employee: Employee
  company: Company
  taxYear: number
}
