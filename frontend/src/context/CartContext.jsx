import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api from '../api/client'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [cart, setCart] = useState({ items: [], total_price: 0 })
  const [loading, setLoading] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  const fetchCart = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/cart')
      setCart(res.data)
    } catch {
      setCart({ items: [], total_price: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    fetchCart()
  }, [authLoading, user, fetchCart])

  const addItem = async (productId, quantity = 1) => {
    const res = await api.post('/cart/items', {
      product_id: productId,
      quantity,
    })
    setCart(res.data)
    setPanelOpen(true)
    return res.data
  }

  const updateItem = async (itemId, quantity) => {
    const res = await api.put(`/cart/items/${itemId}`, { quantity })
    setCart(res.data)
    return res.data
  }

  const removeItem = async (itemId) => {
    const res = await api.delete(`/cart/items/${itemId}`)
    setCart(res.data)
    return res.data
  }

  const clearCart = () => {
    setCart({ items: [], total_price: 0 })
  }

  const itemsCount = cart.items?.reduce((sum, i) => sum + i.quantity, 0) || 0

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        itemsCount,
        panelOpen,
        openPanel: () => setPanelOpen(true),
        closePanel: () => setPanelOpen(false),
        addItem,
        updateItem,
        removeItem,
        fetchCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
