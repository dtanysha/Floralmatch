import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

// Гостевая сессия: UUID в localStorage
function getSessionId() {
  let sid = localStorage.getItem('session_id')
  if (!sid) {
    sid = (crypto.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    }))
    localStorage.setItem('session_id', sid)
  }
  return sid
}

const api = axios.create({
  baseURL: API_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['X-Session-ID'] = getSessionId()
  return config
})

// Если токен протух — чистим и отправляем на /login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
