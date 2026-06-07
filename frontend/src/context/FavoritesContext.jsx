import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api from '../api/client'
import { useAuth } from './AuthContext'

const FavoritesContext = createContext(null)

export function FavoritesProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [ids, setIds] = useState(new Set())

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setIds(new Set())
      return
    }
    try {
      const res = await api.get('/favorites')
      setIds(new Set(res.data.items.map((f) => f.product_id)))
    } catch {
      setIds(new Set())
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    fetchFavorites()
  }, [authLoading, user, fetchFavorites])

  const isFavorite = (productId) => ids.has(productId)

  const toggle = async (productId) => {
    if (!user) {
      throw new Error('Требуется авторизация')
    }
    const next = new Set(ids)
    if (ids.has(productId)) {
      await api.delete(`/favorites/${productId}`)
      next.delete(productId)
    } else {
      try {
        await api.post(`/favorites/${productId}`)
        next.add(productId)
      } catch (err) {
        if (err.response?.status === 409) {
          next.add(productId)
        } else {
          throw err
        }
      }
    }
    setIds(next)
  }

  return (
    <FavoritesContext.Provider value={{ ids, isFavorite, toggle, refresh: fetchFavorites }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
