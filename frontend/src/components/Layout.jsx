import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Transactions', end: true },
  { to: '/import', label: 'Import' },
  { to: '/categories', label: 'Categories' },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-48 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="px-4 py-5 border-b border-slate-800">
          <span className="text-lg font-semibold tracking-tight text-white">Copperline</span>
        </div>
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {navItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-2 rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
