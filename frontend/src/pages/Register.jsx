import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Email: формат + домен минимум 2 символа после последней точки
    const emailRe = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
    if (!emailRe.test(form.email)) {
      setError('Укажите корректный email (например, name@mail.ru)')
      return
    }

    if (!form.full_name.trim() || form.full_name.trim().length < 2) {
      setError('Укажите имя (минимум 2 символа)')
      return
    }

    const phoneClean = form.phone.replace(/[\s\-\(\)]/g, '')
    if (!phoneClean || !/^\+?\d{7,15}$/.test(phoneClean)) {
      setError('Укажите корректный номер телефона')
      return
    }

    if (form.password.length < 6) {
      setError('Пароль должен быть не короче 6 символов')
      return
    }

    setLoading(true)
    try {
      await register(form)
      navigate('/profile', { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      if (detail === 'Email already registered') {
        setError('Такой email уже зарегистрирован')
      } else {
        setError(detail || 'Не удалось зарегистрироваться')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <h1 className="auth__title">Регистрация</h1>
        <p className="auth__subtitle">Создайте аккаунт, чтобы сохранять заказы</p>

        <form onSubmit={handleSubmit} className="auth__form">
          <label className="auth__field">
            <span className="auth__label">Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={update('email')}
              className="auth__input"
              autoComplete="email"
            />
          </label>

          <label className="auth__field">
            <span className="auth__label">Имя</span>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={update('full_name')}
              className="auth__input"
              autoComplete="name"
              placeholder="Мария"
            />
          </label>

          <label className="auth__field">
            <span className="auth__label">Телефон</span>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={update('phone')}
              className="auth__input"
              autoComplete="tel"
              placeholder="+7 (999) 123-45-67"
            />
          </label>

          <label className="auth__field">
            <span className="auth__label">Пароль</span>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={update('password')}
              className="auth__input"
              autoComplete="new-password"
            />
            <span className="auth__hint">Минимум 6 символов</span>
          </label>

          {error && <p className="auth__error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary auth__submit"
            disabled={loading}
          >
            {loading ? 'Создаём…' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="auth__switch">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  )
}
