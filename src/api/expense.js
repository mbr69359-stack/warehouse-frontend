import request from './request'

export const getExpenses = params => request.get('/expenses', { params })
export const createExpense = data => request.post('/expenses', data)
export const updateExpense = (id, data) => request.put(`/expenses/${id}`, data)
export const deleteExpense = id => request.delete(`/expenses/${id}`)

export const EXPENSE_TYPES = [
  { value: 'UNLOADING',  label: '卸货费' },
  { value: 'DELIVERY',   label: '配送费' },
  { value: 'SALARY',     label: '员工工资' },
  { value: 'COMMISSION', label: '销售提成' },
  { value: 'STORAGE',    label: '仓储费' },
  { value: 'OTHER',      label: '其他' }
]

export const expenseTypeLabel = type =>
  EXPENSE_TYPES.find(t => t.value === type)?.label || type