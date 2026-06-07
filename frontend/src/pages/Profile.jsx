import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import './Profile.css'

const STATUS_LABELS = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  assembling: 'Собирается',
  ready: 'Готов',
  delivering: 'В доставке',
  completed: 'Выполнен',
  cancelled: 'Отменён',
}

export default function Profile() {
  const { user, logout, refreshUser } = useAuth()

  const [tab, setTab] = useState('info')
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    password: '',
  })
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')

  useEffect(() => {
    if (tab !== 'orders') return
    setOrdersLoading(true)
    setOrdersError('')
    api
      .get('/orders')
      .then((res) => setOrders(res.data.items || []))
      .catch(() => setOrdersError('Не удалось загрузить заказы'))
      .finally(() => setOrdersLoading(false))
  }, [tab])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveMessage('')
    setSaveError('')
    setSaving(true)
    try {
      const payload = {
        full_name: form.full_name || null,
        phone: form.phone || null,
      }
      if (form.password) payload.password = form.password

      await api.put('/users/me', payload)
      await refreshUser()
      setSaveMessage('Сохранено')
      setForm({ ...form, password: '' })
      setTimeout(() => setSaveMessage(''), 2500)
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="profile">
      <div className="container">
        <div className="profile__header">
          <div>
            <h1>Личный кабинет</h1>
            <p className="profile__email">{user.email}</p>
          </div>
          <button onClick={logout} className="btn btn-secondary">
            Выйти
          </button>
        </div>

        <div className="profile__tabs">
          <button
            className={`profile__tab ${tab === 'info' ? 'profile__tab--active' : ''}`}
            onClick={() => setTab('info')}
          >
            Профиль
          </button>
          <button
            className={`profile__tab ${tab === 'orders' ? 'profile__tab--active' : ''}`}
            onClick={() => setTab('orders')}
          >
            Мои заказы
          </button>
        </div>

        {tab === 'info' && (
          <form onSubmit={handleSave} className="profile__form">
            <label className="profile__field">
              <span className="profile__label">Email</span>
              <input
                type="email"
                value={user.email}
                disabled
                className="profile__input profile__input--disabled"
              />
            </label>

            <label className="profile__field">
              <span className="profile__label">ФИО</span>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="profile__input"
              />
            </label>

            <label className="profile__field">
              <span className="profile__label">Телефон</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="profile__input"
              />
            </label>

            <label className="profile__field">
              <span className="profile__label">Новый пароль</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="profile__input"
                placeholder="Оставьте пустым, чтобы не менять"
                minLength={6}
              />
            </label>

            {saveError && <p className="profile__error">{saveError}</p>}
            {saveMessage && <p className="profile__success">{saveMessage}</p>}

            <button
              type="submit"
              className="btn btn-primary profile__submit"
              disabled={saving}
            >
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </form>
        )}

        {tab === 'orders' && (
          <div className="profile__orders">
            {ordersLoading && <p className="profile__status">Загрузка…</p>}
            {ordersError && <p className="profile__status">{ordersError}</p>}
            {!ordersLoading && !ordersError && orders.length === 0 && (
              <div className="profile__empty">
                <p>У вас пока нет заказов</p>
                <Link to="/catalog" className="btn btn-primary" style={{ marginTop: 16 }}>
                  В каталог
                </Link>
              </div>
            )}
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-card__inner">
                  {(order.image_url || order.items?.[0]?.product?.image_url) && (
                    <div className="order-card__image">
                      <img src={order.image_url || order.items[0].product.image_url} alt={`Заказ №${order.id}`} />
                    </div>
                  )}
                  <div className="order-card__body">
                    <p className="order-card__id">
                      Заказ №{order.id} <span className="order-card__date">(от {new Date(order.created_at).toLocaleDateString('ru-RU')})</span>
                    </p>
                    <p className="order-card__info">
                      {order.items?.length || 0} позиций · {Math.round(order.total_price)} ₽
                    </p>
                    {order.delivery_address && (
                      <p className="order-card__delivery">{order.delivery_address}</p>
                    )}
                  </div>
                  <span className={`order-card__status order-card__status--${order.status}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
