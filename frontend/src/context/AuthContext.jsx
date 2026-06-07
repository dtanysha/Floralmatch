import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // При загрузке — пробуем получить текущего пользователя по токену
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get('/users/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('token')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    // OAuth2PasswordRequestForm ждёт form-data с полями username/password
    const body = new URLSearchParams()
    body.append('username', email)
    body.append('password', password)

    const res = await api.post('/auth/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    localStorage.setItem('token', res.data.access_token)

    // Сливаем гостевую корзину, если есть
    const sessionId = localStorage.getItem('session_id')
    if (sessionId) {
      try {
        await api.post('/cart/merge', { session_id: sessionId })
      } catch {
        // игнорируем, если нечего сливать
      }
    }

    const me = await api.get('/users/me')
    setUser(me.data)
    return me.data
  }

  const register = async ({ email, password, full_name, phone }) => {
    await api.post('/auth/register', { email, password, full_name, phone })
    return login(email, password)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const refreshUser = async () => {
    const res = await api.get('/users/me')
    setUser(res.data)
    return res.data
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
