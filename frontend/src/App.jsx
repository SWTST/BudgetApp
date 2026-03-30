import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import TransactionsPage from './pages/TransactionsPage'
import ImportPage from './pages/ImportPage'
import CategoriesPage from './pages/CategoriesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<TransactionsPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="categories" element={<CategoriesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
