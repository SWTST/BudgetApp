import { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [newParentName, setNewParentName] = useState('')
  const [addingChildTo, setAddingChildTo] = useState(null)
  const [newChildName, setNewChildName] = useState('')

  useEffect(() => {
    api.getCategories().then(setCategories)
  }, [])

  const parents = categories.filter((c) => c.parentCategoryId === null)

  function childrenOf(parentId) {
    return categories
      .filter((c) => c.parentCategoryId === parentId)
      .sort((a, b) => a.displayOrder - b.displayOrder)
  }

  function startEdit(cat) {
    setEditingId(cat.categoryId)
    setEditName(cat.name)
  }

  async function saveEdit(cat) {
    if (!editName.trim() || editName === cat.name) {
      setEditingId(null)
      return
    }
    try {
      const updated = await api.updateCategory(cat.categoryId, { name: editName.trim() })
      setCategories((prev) => prev.map((c) => (c.categoryId === updated.categoryId ? updated : c)))
    } catch (err) {
      alert(`Failed to rename: ${err.message}`)
    }
    setEditingId(null)
  }

  async function toggleActive(cat) {
    try {
      if (cat.isActive) {
        await api.deleteCategory(cat.categoryId)
        setCategories((prev) => prev.map((c) => (c.categoryId === cat.categoryId ? { ...c, isActive: false } : c)))
      } else {
        const updated = await api.updateCategory(cat.categoryId, { isActive: true })
        setCategories((prev) => prev.map((c) => (c.categoryId === updated.categoryId ? updated : c)))
      }
    } catch (err) {
      alert(`Failed to update: ${err.message}`)
    }
  }

  async function moveOrder(cat, direction) {
    // Find siblings and swap display orders
    const siblings = categories
      .filter((c) => c.parentCategoryId === cat.parentCategoryId && c.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
    const idx = siblings.findIndex((c) => c.categoryId === cat.categoryId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= siblings.length) return
    const swap = siblings[swapIdx]
    try {
      await Promise.all([
        api.updateCategory(cat.categoryId, { displayOrder: swap.displayOrder }),
        api.updateCategory(swap.categoryId, { displayOrder: cat.displayOrder }),
      ])
      setCategories((prev) =>
        prev.map((c) => {
          if (c.categoryId === cat.categoryId) return { ...c, displayOrder: swap.displayOrder }
          if (c.categoryId === swap.categoryId) return { ...c, displayOrder: cat.displayOrder }
          return c
        })
      )
    } catch (err) {
      alert(`Failed to reorder: ${err.message}`)
    }
  }

  async function addParent(e) {
    e.preventDefault()
    if (!newParentName.trim()) return
    const maxOrder = parents.reduce((m, c) => Math.max(m, c.displayOrder), 0)
    try {
      const created = await api.createCategory({ name: newParentName.trim(), displayOrder: maxOrder + 10 })
      setCategories((prev) => [...prev, created])
      setNewParentName('')
    } catch (err) {
      alert(`Failed to create category: ${err.message}`)
    }
  }

  async function addChild(parentId, e) {
    e.preventDefault()
    if (!newChildName.trim()) return
    const children = childrenOf(parentId)
    const maxOrder = children.reduce((m, c) => Math.max(m, c.displayOrder), 0)
    try {
      const created = await api.createCategory({ name: newChildName.trim(), parentCategoryId: parentId, displayOrder: maxOrder + 10 })
      setCategories((prev) => [...prev, created])
      setNewChildName('')
      setAddingChildTo(null)
    } catch (err) {
      alert(`Failed to create category: ${err.message}`)
    }
  }

  function CategoryRow({ cat, isChild }) {
    const isEditing = editingId === cat.categoryId
    return (
      <div className={`flex items-center gap-2 py-1.5 ${isChild ? 'pl-6' : ''} ${!cat.isActive ? 'opacity-40' : ''}`}>
        {/* Up/down */}
        <div className="flex flex-col gap-0.5">
          <button onClick={() => moveOrder(cat, 'up')} className="text-slate-600 hover:text-slate-300 text-xs leading-none">▲</button>
          <button onClick={() => moveOrder(cat, 'down')} className="text-slate-600 hover:text-slate-300 text-xs leading-none">▼</button>
        </div>

        {/* Name — editable on click */}
        {isEditing ? (
          <input
            autoFocus
            className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-sm text-white flex-1"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => saveEdit(cat)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(cat); if (e.key === 'Escape') setEditingId(null) }}
          />
        ) : (
          <span
            className={`flex-1 text-sm cursor-pointer hover:text-white ${isChild ? 'text-slate-300' : 'font-medium text-white'}`}
            onClick={() => startEdit(cat)}
            title="Click to rename"
          >
            {cat.name}
          </span>
        )}

        {/* Toggle active */}
        <button
          onClick={() => toggleActive(cat)}
          className={`text-xs px-2 py-0.5 rounded ${cat.isActive ? 'text-slate-500 hover:text-red-400' : 'text-slate-600 hover:text-emerald-400'}`}
          title={cat.isActive ? 'Deactivate' : 'Reactivate'}
        >
          {cat.isActive ? 'hide' : 'show'}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-white mb-1">Categories</h1>
      <p className="text-slate-400 text-sm mb-6">Click a name to rename it. Use ▲▼ to reorder.</p>

      <div className="space-y-4">
        {parents
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((parent) => {
            const children = childrenOf(parent.categoryId)
            return (
              <div key={parent.categoryId} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                <CategoryRow cat={parent} isChild={false} />

                {children.map((child) => (
                  <CategoryRow key={child.categoryId} cat={child} isChild />
                ))}

                {/* Add child */}
                {addingChildTo === parent.categoryId ? (
                  <form onSubmit={(e) => addChild(parent.categoryId, e)} className="flex gap-2 mt-2 pl-6">
                    <input
                      autoFocus
                      placeholder="New subcategory name"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                      value={newChildName}
                      onChange={(e) => setNewChildName(e.target.value)}
                    />
                    <button type="submit" className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded">Add</button>
                    <button type="button" onClick={() => setAddingChildTo(null)} className="text-xs text-slate-500 hover:text-white px-2">✕</button>
                  </form>
                ) : (
                  <button
                    className="mt-1 pl-6 text-xs text-slate-600 hover:text-slate-400"
                    onClick={() => { setAddingChildTo(parent.categoryId); setNewChildName('') }}
                  >
                    + add subcategory
                  </button>
                )}
              </div>
            )
          })}
      </div>

      {/* Add parent */}
      <form onSubmit={addParent} className="mt-5 flex gap-2">
        <input
          placeholder="New top-level category name"
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder:text-slate-500"
          value={newParentName}
          onChange={(e) => setNewParentName(e.target.value)}
        />
        <button
          type="submit"
          disabled={!newParentName.trim()}
          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded"
        >
          Add category
        </button>
      </form>
    </div>
  )
}
