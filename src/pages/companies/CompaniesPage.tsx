import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompanyStore } from '@/store/companyStore'
import { useLimitsStore } from '@/store/limitsStore'
import { canAddCompany, limitLabel } from '@/lib/planLimits'
import { useForm } from 'react-hook-form'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import type { Company } from '@/types/database'

type FormData = {
  name: string; cra_bn: string; street: string
  city: string; province: 'ON' | 'AB' | 'BC'; postal: string
  first_period_start: string
}

const PROVINCE_OPTIONS = [
  { value: 'ON', label: 'Ontario (ON)' },
  { value: 'AB', label: 'Alberta (AB)' },
  { value: 'BC', label: 'British Columbia (BC)' },
]

export default function CompaniesPage() {
  const navigate = useNavigate()
  const { companies, fetchCompanies, createCompany, updateCompany, deleteCompany } = useCompanyStore()
  const { limits } = useLimitsStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState<Company | null>(null)
  const [logoData,  setLogoData]  = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>()

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  const atLimit = limits ? !canAddCompany(limits, companies.length) : false

  function openNew() {
    setEditing(null); setLogoData(null)
    reset({ name:'', cra_bn:'', street:'', city:'', province:'ON', postal:'', first_period_start:'' })
    setModalOpen(true)
  }

  function openEdit(c: Company) {
    setEditing(c); setLogoData(c.logo_url)
    reset({ name: c.name, cra_bn: c.cra_bn ?? '', street: c.street, city: c.city, province: c.province, postal: c.postal, first_period_start: c.first_period_start ?? '' })
    setModalOpen(true)
  }

  async function onSubmit(data: FormData) {
    if (editing) {
      await updateCompany(editing.id, { ...data, logo_url: logoData ?? editing.logo_url })
    } else {
      await createCompany({ ...data, logo_url: logoData })
    }
    setModalOpen(false)
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Logo must be under 2 MB'); return }
    const reader = new FileReader()
    reader.onload = ev => setLogoData(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1>Companies</h1>
        <div className="flex items-center gap-3">
          {limits && (
            <span className="text-xs text-gray-400">
              {limitLabel(limits.max_companies, 'companies')} on your plan
            </span>
          )}
          <button className="btn-primary" onClick={openNew} disabled={atLimit && !editing}>
            + Add Company
          </button>
        </div>
      </div>
      {atLimit && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-yellow-800">
            You've reached your plan's company limit ({limits?.max_companies}).
          </p>
          <button className="btn-primary text-sm shrink-0" onClick={() => navigate('/billing')}>
            Upgrade Plan
          </button>
        </div>
      )}

      {companies.length === 0 ? (
        <Card>
          <p className="text-gray-400 text-sm text-center py-8">
            No companies yet. Add your first company to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {companies.map(c => (
            <Card key={c.id} className="flex items-center gap-4 p-4">
              {c.logo_url
                ? <img src={c.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-contain border border-gray-200" />
                : <div className="w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {c.name.substring(0, 2).toUpperCase()}
                  </div>
              }
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800">{c.name}</div>
                <div className="text-xs text-gray-400">{c.street}, {c.city}, {c.province} {c.postal}</div>
                {c.cra_bn && <div className="text-xs text-gray-400">BN: {c.cra_bn}</div>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="btn-ghost text-xs py-1.5 px-3" onClick={() => openEdit(c)}>Edit</button>
                <button className="btn-danger text-xs py-1.5 px-3" onClick={() => {
                  if (confirm(`Delete ${c.name}?`)) deleteCompany(c.id)
                }}>Delete</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Company' : 'New Company'}
        size="md"
        footer={
          <>
            <button className="btn-primary" onClick={handleSubmit(onSubmit)}>
              {editing ? 'Save Changes' : 'Create Company'}
            </button>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Company Name" required error={errors.name?.message}
                {...register('name', { required: 'Required' })} />
            </div>
            <Input label="CRA Business Number" placeholder="123456789 RT0001"
              {...register('cra_bn')} />
            <Input label="Street Address" required error={errors.street?.message}
              {...register('street', { required: 'Required' })} />
            <Input label="City" required error={errors.city?.message}
              {...register('city', { required: 'Required' })} />
            <Select label="Province" required options={PROVINCE_OPTIONS}
              placeholder="— Select —" error={errors.province?.message}
              {...register('province', { required: 'Required' })} />
            <Input label="Postal Code" required error={errors.postal?.message}
              {...register('postal', { required: 'Required' })} />
            <div className="col-span-2">
              <Input label="First Pay Period Start Date" type="date"
                hint="The start date of the very first pay period for this company. Used to align all future period calculations correctly."
                {...register('first_period_start')} />
            </div>
          </div>

          {/* Logo */}
          <div>
            <label className="label">Company Logo <span className="text-gray-400 font-normal">(optional)</span></label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-brand-400 transition-colors cursor-pointer relative">
              <input type="file" accept="image/*" onChange={onLogoChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              {logoData
                ? <img src={logoData} alt="preview" className="max-h-16 mx-auto object-contain" />
                : <p className="text-sm text-gray-400">Click to upload logo (PNG, JPG — max 2 MB)</p>
              }
            </div>
            {logoData && (
              <button className="text-xs text-red-500 mt-1 hover:underline" onClick={() => setLogoData(null)}>
                Remove logo
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
