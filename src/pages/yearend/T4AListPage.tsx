import SlipListPage from './SlipListPage'
import { generateT4APDF } from '@/lib/yearEndPdfGenerator'
import type { T4ASlip, Company } from '@/types/database'

export default function T4AListPage() {
  return (
    <SlipListPage
      table="t4a_slips"
      title="T4A Slips"
      subtitle="Statement of Pension, Retirement, Annuity & Other Income — self-employed, contractors, pension"
      editRoute="/yearend/t4a"
      color="text-purple-700"
      onDownload={(slip, co) => {
        const blob = generateT4APDF(slip as unknown as T4ASlip, co as Company)
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = `T4A_${(slip.recipient_name).replace(/\s+/g,'_')}_${slip.tax_year}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }}
    />
  )
}
