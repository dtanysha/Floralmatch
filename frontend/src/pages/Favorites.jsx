import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import ProductCard from '../components/ProductCard'
import './Favorites.css'

export default function Favorites() {
  const { user, loading: authLoading } = useAuth()
  const { ids } = useFavorites()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .get('/favorites')
      .then((res) => setProducts(res.data.items.map((f) => f.product)))
      .catch(() => setError('Не удалось загрузить избранное'))
      .finally(() => setLoading(false))
  }, [authLoading, user])

  // Если пользователь удалил что-то — обновляем локальный список
  useEffect(() => {
    setProducts((prev) => prev.filter((p) => ids.has(p.id)))
  }, [ids])

  if (authLoading) {
    return (
      <div className="container" style={{ padding: '80px 32px', textAlign: 'center' }}>
        Загрузка…
      </div>
    )
  }

  if (!user) {
    return (
      <div className="favorites">
        <div className="container">
          <h1>Избранное</h1>
          <div className="favorites__guest">
            <p>Войдите, чтобы сохранять понравившиеся товары</p>
            <div className="favorites__guest-actions">
              <Link to="/login" className="btn btn-primary">
                Войти
              </Link>
              <Link to="/register" className="btn btn-secondary">
                Зарегистрироваться
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="favorites">
      <div className="container">
        <div className="favorites__header">
          <h1>Избранное</h1>
          <p className="favorites__count">
            {loading ? 'Загрузка…' : `Товаров: ${products.length}`}
          </p>
        </div>

        {error && <p className="favorites__status">{error}</p>}

        {!loading && !error && products.length === 0 && (
          <div className="favorites__empty">
            <p>В избранном пока пусто</p>
            <Link to="/catalog" className="btn btn-primary">
              В каталог
            </Link>
          </div>
        )}

        {products.length > 0 && (
          <div className="favorites__grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
