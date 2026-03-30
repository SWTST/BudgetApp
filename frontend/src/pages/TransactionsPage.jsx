import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

function formatAmount(pence) {
  const abs = Math.abs(pence) / 100
  const formatted = abs.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return pence >= 0 ? `+£${formatted}` : `-£${formatted}`
}

function buildCategoryOptions(categories) {
  // Returns [{label, options: [{value, label}]}] for grouped <optgroup>
  const parents = categories.filter((c) => c.parentCategoryId === null && c.isActive)
  return parents.map((parent) => ({
    label: parent.name,
    options: categories.filter((c) => c.parentCategoryId === parent.categoryId && c.isActive),
  }))
}

export default function TransactionsPage() {
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [search, setSearch] = useState('')
  const [uncategorisedOnly, setUncategorisedOnly] = useState(false)

  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load accounts and categories once
  useEffect(() => {
    Promise.all([api.getAccounts(), api.getCategories()]).then(([accs, cats]) => {
      setAccounts(accs)
      setCategories(cats)
      if (accs.length === 1) setAccountId(String(accs[0].accountId))
    })
  }, [])

  const loadTransactions = useCallback(() => {
    if (!accountId) return
    setLoading(true)
    setError(null)
    api
      .getTransactions({
        account_id: accountId,
        year,
        month,
        search: search || undefined,
        uncategorised_only: uncategorisedOnly || undefined,
      })
      .then((data) => setTransactions(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [accountId, year, month, search, uncategorisedOnly])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  async function handleCategoryChange(transactionId, newCategoryId) {
    try {
      await api.updateTransaction(transactionId, { categoryId: newCategoryId ? Number(newCategoryId) : null })
      setTransactions((prev) =>
        prev.map((t) => {
          if (t.transactionId !== transactionId) return t
          const cat = categories.find((c) => c.categoryId === Number(newCategoryId))
          const parent = cat ? categories.find((c) => c.categoryId === cat.parentCategoryId) : null
          return {
            ...t,
            categoryId: newCategoryId ? Number(newCategoryId) : null,
            categoryName: cat?.name ?? null,
            parentCategoryName: parent?.name ?? null,
          }
        })
      )
    } catch (err) {
      alert(`Failed to update category: ${err.message}`)
    }
  }

  const groupedCategories = buildCategoryOptions(categories)

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const totalCredit = transactions.filter((t) => t.amountPence > 0).reduce((s, t) => s + t.amountPence, 0)
  const totalDebit = transactions.filter((t) => t.amountPence < 0).reduce((s, t) => s + t.amountPence, 0)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white mb-4">Transactions</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {accounts.length > 1 && (
          <select
            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">— account —</option>
            {accounts.map((a) => (
              <option key={a.accountId} value={a.accountId}>{a.accountName}</option>
            ))}
          </select>
        )}

        <select
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {months.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>

        <select
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
        </select>

        <input
          type="search"
          placeholder="Search description…"
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white placeholder:text-slate-500 w-52"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            className="rounded"
            checked={uncategorisedOnly}
            onChange={(e) => setUncategorisedOnly(e.target.checked)}
          />
          Uncategorised only
        </label>
      </div>

      {/* Summary bar */}
      {transactions.length > 0 && (
        <div className="flex gap-6 mb-4 text-sm">
          <span className="text-slate-400">{transactions.length} transactions</span>
          <span className="text-emerald-400">In: {formatAmount(totalCredit)}</span>
          <span className="text-red-400">Out: {formatAmount(Math.abs(totalDebit))} </span>
          <span className={`font-medium ${totalCredit + totalDebit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
            Net: {formatAmount(totalCredit + totalDebit)}
          </span>
        </div>
      )}

      {/* State messages */}
      {!accountId && (
        <p className="text-slate-500 text-sm">Select an account to view transactions. Go to <a href="/import" className="underline text-slate-400">Import</a> to add your first account.</p>
      )}
      {loading && <p className="text-slate-400 text-sm">Loading…</p>}
      {error && <p className="text-red-400 text-sm">Error: {error}</p>}
      {!loading && !error && accountId && transactions.length === 0 && (
        <p className="text-slate-500 text-sm">No transactions found for this period.</p>
      )}

      {/* Table */}
      {transactions.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-800 bg-slate-900">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium w-full">Description</th>
                <th className="px-3 py-2 font-medium text-right">Amount</th>
                <th className="px-3 py-2 font-medium min-w-48">Category</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.transactionId} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                  <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{t.transactionDate}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                    <span className="font-mono text-xs bg-slate-800 px-1.5 py-0.5 rounded">{t.transactionType}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-200">{t.description}</td>
                  <td className={`px-3 py-2 text-right whitespace-nowrap font-mono text-xs ${t.amountPence >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatAmount(t.amountPence)}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                      value={t.categoryId ?? ''}
                      onChange={(e) => handleCategoryChange(t.transactionId, e.target.value || null)}
                    >
                      <option value="">— uncategorised —</option>
                      {groupedCategories.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.options.map((c) => (
                            <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
