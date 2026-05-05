import SlipListPage from './SlipListPage'
import { generateT5PDF } from '@/lib/yearEndPdfGenerator'
import type { T5Slip, Company } from '@/types/database'

export default function T5ListPage() {
  return (
    <SlipListPage
      table="t5_slips"
      title="T5 Slips"
      subtitle="Statement of Investment Income — dividends, interest, royalties"
      editRoute="/yearend/t5"
      color="text-green-700"
      onDownload={(slip, co) => {
        const blob = generateT5PDF(slip as unknown as T5Slip, co as Company)
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = `T5_${(slip.recipient_name).replace(/\s+/g,'_')}_${slip.tax_year}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }}
    />
  )
}
