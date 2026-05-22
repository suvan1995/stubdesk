import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompanyStore } from '@/store/companyStore'
import { useLimitsStore } from '@/store/limitsStore'
import { canAddEmployee, limitLabel } from '@/lib/planLimits'
import { useForm } from 'react-hook-form'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import type { Employee } from '@/types/database'

type FormData = {
  company_id: string; name: string; emp_id: string; sin_last3: string
  address: string; job_title: string; department: string
  emp_type: 'salaried' | 'hourly'; rate: number; std_weekly_hours: number
  pay_frequency: number; start_date: string; bank_account_last4: string
}

const FREQ_OPTIONS = [
  { value: 52, label: 'Weekly (52/year)' },
  { value: 26, label: 'Bi-Weekly (26/year)' },
  { value: 24, label: 'Semi-Monthly (24/year)' },
  { value: 12, label: 'Monthly (12/year)' },
]

export default function EmployeesPage() {
  const navigate = useNavigate()
  const { companies, employees, fetchCompanies, fetchEmployees, createEmployee, updateEmployee, deleteEmployee } = useCompanyStore()
  const { limits } = useLimitsStore()
  const { success, error: toastError } = useToast()
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editing,     setEditing]     = useState<Employee | null>(null)
  const [filterCo,    setFilterCo]    = useState('')
  const [submitting,  setSubmitting]  = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>()
  const empType = watch('emp_type', 'salaried')

  useEffect(() => { fetchCompanies(); fetchEmployees() }, [fetchCompanies, fetchEmployees])

  // Count employees in the selected company (for limit check)
  function empCountForCo(coId: string) {
    return employees.filter(e => e.company_id === coId).length
  }
  function atLimitForCo(coId: string) {
    if (!limits) return false
    return !canAddEmployee(limits, empCountForCo(coId))
  }

  function openNew() {
    setEditing(null)
    reset({ emp_type: 'salaried', std_weekly_hours: 40, pay_frequency: 26, rate: 0 })
    setModalOpen(true)
  }

  function openEdit(e: Employee) {
    setEditing(e)
    reset({
      company_id: e.company_id, name: e.name, emp_id: e.emp_id ?? '',
      sin_last3: e.sin_last3 ?? '', address: e.address ?? '',
      job_title: e.job_title ?? '', department: e.department ?? '',
      emp_type: e.emp_type, rate: e.rate, std_weekly_hours: e.std_weekly_hours,
      pay_frequency: e.pay_frequency, start_date: e.start_date ?? '',
      bank_account_last4: e.bank_account_last4 ?? '',
    })
    setModalOpen(true)
  }

  async function onSubmit(data: FormData) {
    const payload = {
      ...data,
      rate: Number(data.rate),
      std_weekly_hours: Number(data.std_weekly_hours),
      pay_frequency: Number(data.pay_frequency) as 52|26|24|12,
      // Convert empty strings to null for date/optional fields
      start_date: data.start_date || null,
      emp_id: data.emp_id || null,
      sin_last3: data.sin_last3 || null,
      address: data.address || null,
      job_title: data.job_title || null,
      department: data.department || null,
      bank_account_last4: data.bank_account_last4 || null,
    }
    setSubmitting(true)
    try {
      if (editing) {
        const { error } = await updateEmployee(editing.id, payload)
        if (error) { toastError('Failed to update employee', error); return }
        success('Employee updated')
      } else {
        const result = await createEmployee(payload)
        if (!result) { toastError('Failed to create employee', 'Check the console for details.'); return }
        success('Employee created')
      }
      setModalOpen(false)
    } catch (err) {
      console.error('Error submitting employee:', err)
      toastError('Unexpected error', String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = filterCo ? employees.filter(e => e.company_id === filterCo) : employees
  const coOptions = companies.map(c => ({ value: c.id, label: c.name }))

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1>Employees</h1>
        <div className="flex gap-3 flex-wrap items-center">
          {limits && filterCo && (
            <span className="text-xs text-gray-400">
              {empCountForCo(filterCo)}/{limits.max_employees_per_co === -1 ? '∞' : limits.max_employees_per_co} employees
            </span>
          )}
          <select className="input w-48 text-sm" value={filterCo} onChange={e => setFilterCo(e.target.value)}>
            <option value="">All companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            className="btn-primary"
            onClick={openNew}
            disabled={!!(filterCo && atLimitForCo(filterCo))}
          >
            + Add Employee
          </button>
        </div>
      </div>
      {filterCo && atLimitForCo(filterCo) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-yellow-800">
            Employee limit reached for this company ({limitLabel(limits!.max_employees_per_co, 'employees per company')}).
          </p>
          <button className="btn-primary text-sm shrink-0" onClick={() => navigate('/billing')}>
            Upgrade Plan
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card><p className="text-gray-400 text-sm text-center py-8">No employees found.</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(emp => {
            const co = companies.find(c => c.id === emp.company_id)
            return (
              <Card key={emp.id} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {emp.name.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800">{emp.name}</div>
                  <div className="text-xs text-gray-400">
                    {[emp.job_title, emp.department, co?.name].filter(Boolean).join(' · ')}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {emp.emp_type === 'salaried' ? `$${emp.rate.toLocaleString()}/yr` : `$${emp.rate}/hr`}
                    {' · '}{FREQ_OPTIONS.find(f => f.value === emp.pay_frequency)?.label}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="btn-ghost text-xs py-1.5 px-3" onClick={() => openEdit(emp)}>Edit</button>
                  <button className="btn-danger text-xs py-1.5 px-3" onClick={async () => {
                    if (!confirm(`Delete ${emp.name}?`)) return
                    const { error } = await deleteEmployee(emp.id)
                    if (error) toastError('Failed to delete employee', error)
                    else success(`${emp.name} deleted`)
                  }}>Delete</button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Employee' : 'New Employee'} size="lg"
        footer={
          <>
            <button className="btn-primary" onClick={handleSubmit(onSubmit)} disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Create Employee'}
            </button>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Select label="Company" required options={coOptions} placeholder="— Select Company —"
              error={errors.company_id?.message}
              {...register('company_id', { required: 'Required' })} />
          </div>
          <Input label="Full Name" required error={errors.name?.message}
            {...register('name', { required: 'Required' })} />
          <Input label="Employee ID" {...register('emp_id')} />
          <Input label="SIN (last 3 digits)" maxLength={3} {...register('sin_last3')} />
          <Input label="Bank Account (last 4 digits)" maxLength={4} placeholder="For EFT payments" {...register('bank_account_last4')} />
          <div className="col-span-2">
            <Input label="Address" {...register('address')} />
          </div>
          <Input label="Job Title" {...register('job_title')} />
          <Input label="Department" {...register('department')} />
          <Select label="Employment Type" required
            options={[{ value:'salaried', label:'Salaried' }, { value:'hourly', label:'Hourly' }]}
            {...register('emp_type')} />
          <Input label={empType === 'salaried' ? 'Annual Salary ($)' : 'Hourly Rate ($)'}
            type="number" step="0.01" min="0" required error={errors.rate?.message}
            {...register('rate', { required: 'Required', min: 0 })} />
          <Input label="Standard Weekly Hours" type="number" step="0.5" min="1" max="60"
            {...register('std_weekly_hours')} />
          <Select label="Pay Frequency" required options={FREQ_OPTIONS}
            {...register('pay_frequency')} />
          <Input label="Employment Start Date" type="date" {...register('start_date')} />
        </div>
      </Modal>
    </div>
  )
}
