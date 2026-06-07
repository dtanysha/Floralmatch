import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || '/profile'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(detail || 'Не удалось войти. Проверьте email и пароль.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <h1 className="auth__title">Вход</h1>
        <p className="auth__subtitle">Войдите, чтобы видеть заказы и избранное</p>

        <form onSubmit={handleSubmit} className="auth__form">
          <label className="auth__field">
            <span className="auth__label">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth__input"
              autoComplete="email"
            />
          </label>

          <label className="auth__field">
            <span className="auth__label">Пароль</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth__input"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="auth__error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary auth__submit"
            disabled={loading}
          >
            {loading ? 'Входим…' : 'Войти'}
          </button>

          <button
            type="button"
            className="auth__forgot"
            onClick={() => setShowReset(!showReset)}
          >
            Забыли пароль?
          </button>

          {showReset && (
            <p className="auth__reset-info">
              Свяжитесь с нами для восстановления пароля:<br />
              <a href="tel:+79991234567">+7 (999) 123-45-67</a> или{' '}
              <a href="mailto:info@floralmatch.ru">info@floralmatch.ru</a>
            </p>
          )}
        </form>

        <p className="auth__switch">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  )
}
