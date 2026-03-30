import { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function ImportPage() {
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('')
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState(null)   // null | 'loading' | { result } | { error }
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ accountName: '', bankName: 'Lloyds', accountType: 'Current' })

  useEffect(() => {
    api.getAccounts().then((data) => {
      setAccounts(data)
      if (data.length === 1) setAccountId(String(data[0].accountId))
    })
  }, [])

  async function handleCreateAccount(e) {
    e.preventDefault()
    try {
      const created = await api.createAccount(newAccount)
      const updated = [...accounts, created]
      setAccounts(updated)
      setAccountId(String(created.accountId))
      setShowNewAccount(false)
      setNewAccount({ accountName: '', bankName: 'Lloyds', accountType: 'Current' })
    } catch (err) {
      alert(`Failed to create account: ${err.message}`)
    }
  }

  async function handleImport(e) {
    e.preventDefault()
    if (!accountId || !file) return
    setStatus('loading')
    try {
      const result = await api.uploadImport(accountId, file)
      setStatus({ result })
    } catch (err) {
      setStatus({ error: err.message })
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-white mb-1">Import Statement</h1>
      <p className="text-slate-400 text-sm mb-6">Upload a Lloyds CSV export to import transactions.</p>

      {/* Account selector */}
      <section className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-4">
        <h2 className="text-sm font-medium text-slate-300 mb-3">1. Select account</h2>

        {accounts.length === 0 ? (
          <p className="text-slate-400 text-sm mb-3">No accounts yet. Create one below.</p>
        ) : (
          <select
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-3"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">— select account —</option>
            {accounts.map((a) => (
              <option key={a.accountId} value={a.accountId}>
                {a.accountName} ({a.bankName} · {a.accountType})
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          className="text-xs text-slate-400 hover:text-white underline"
          onClick={() => setShowNewAccount((v) => !v)}
        >
          {showNewAccount ? 'Cancel' : '+ Add new account'}
        </button>

        {showNewAccount && (
          <form onSubmit={handleCreateAccount} className="mt-3 grid gap-2">
            <input
              required
              placeholder="Account name (e.g. Lloyds Current)"
              className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white"
              value={newAccount.accountName}
              onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
            />
            <input
              placeholder="Bank name"
              className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white"
              value={newAccount.bankName}
              onChange={(e) => setNewAccount({ ...newAccount, bankName: e.target.value })}
            />
            <select
              className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white"
              value={newAccount.accountType}
              onChange={(e) => setNewAccount({ ...newAccount, accountType: e.target.value })}
            >
              {['Current', 'Savings', 'Credit', 'Cash'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-slate-600 hover:bg-slate-500 text-white text-sm rounded px-3 py-2 self-start"
            >
              Create account
            </button>
          </form>
        )}
      </section>

      {/* File picker */}
      <section className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-4">
        <h2 className="text-sm font-medium text-slate-300 mb-3">2. Choose CSV file</h2>
        <input
          type="file"
          accept=".csv"
          className="text-sm text-slate-300"
          onChange={(e) => setFile(e.target.files[0] ?? null)}
        />
        {file && <p className="text-xs text-slate-500 mt-1">{file.name}</p>}
      </section>

      {/* Submit */}
      <button
        onClick={handleImport}
        disabled={!accountId || !file || status === 'loading'}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
      >
        {status === 'loading' ? 'Importing…' : 'Import transactions'}
      </button>

      {/* Result */}
      {status && status !== 'loading' && (
        <div className={`mt-5 rounded-lg p-4 text-sm ${status.error ? 'bg-red-950 border border-red-800 text-red-300' : 'bg-emerald-950 border border-emerald-800 text-emerald-300'}`}>
          {status.error ? (
            <p><strong>Import failed:</strong> {status.error}</p>
          ) : (
            <>
              <p className="font-medium mb-1">Import complete</p>
              <ul className="text-emerald-400 space-y-0.5">
                <li>{status.result.inserted} transaction{status.result.inserted !== 1 ? 's' : ''} imported</li>
                <li>{status.result.skipped} duplicate{status.result.skipped !== 1 ? 's' : ''} skipped</li>
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
