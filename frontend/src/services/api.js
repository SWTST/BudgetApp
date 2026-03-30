const BASE_URL = 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

const json = (method, data) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})

export const api = {
  // Accounts
  getAccounts: () => request('/accounts'),
  createAccount: (data) => request('/accounts', json('POST', data)),

  // Categories
  getCategories: () => request('/categories'),
  createCategory: (data) => request('/categories', json('POST', data)),
  updateCategory: (id, data) => request(`/categories/${id}`, json('PUT', data)),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: (params) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    )
    return request(`/transactions?${qs}`)
  },
  updateTransaction: (id, data) => request(`/transactions/${id}`, json('PATCH', data)),

  // Import
  uploadImport: (accountId, file) => {
    const form = new FormData()
    form.append('account_id', accountId)
    form.append('file', file)
    return request('/import/upload', { method: 'POST', body: form })
  },
}
