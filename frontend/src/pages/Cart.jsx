import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import './Cart.css'

const DELIVERY_TIMES = [
  '9:00 — 12:00',
  '12:00 — 15:00',
  '15:00 — 18:00',
  '18:00 — 21:00',
]

export default function Cart() {
  const navigate = useNavigate()
  const { cart, updateItem, removeItem, fetchCart } = useCart()
  const { user } = useAuth()

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    delivery_address: '',
    delivery_date: today,
    delivery_time: DELIVERY_TIMES[0],
    comment: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successOrder, setSuccessOrder] = useState(null)

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (cart.items.length === 0) return

    setError('')
    setSubmitting(true)
    try {
      const sessionId = localStorage.getItem('session_id')
      const payload = { ...form }
      if (!user && sessionId) payload.session_id = sessionId

      // Фото заказа: скриншот конструктора или фото первого товара
      const constructorImg = localStorage.getItem('constructor_image_url')
      if (constructorImg) {
        payload.image_url = constructorImg
      } else if (cart.items.length > 0 && cart.items[0].product?.image_url) {
        payload.image_url = cart.items[0].product.image_url
      }

      const res = await api.post('/orders', payload)
      localStorage.removeItem('constructor_image_url')
      setSuccessOrder(res.data)
      await fetchCart()
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось оформить заказ')
    } finally {
      setSubmitting(false)
    }
  }

  if (successOrder) {
    return (
      <div className="cart-page">
        <div className="container">
          <div className="cart-success">
            <h1>Заказ оформлен!</h1>
            <p className="cart-success__info">
              Номер вашего заказа: <strong>№{successOrder.id}</strong>
            </p>
            <p className="cart-success__text">
              Мы свяжемся с вами для подтверждения по телефону {successOrder.phone}
            </p>
            <div className="cart-success__actions">
              <Link to="/catalog" className="btn btn-primary">
                Продолжить покупки
              </Link>
              {user && (
                <Link to="/profile" className="btn btn-secondary">
                  Мои заказы
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (cart.items.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <h1>Корзина</h1>
          <div className="cart-empty">
            <p>В корзине пока ничего нет</p>
            <Link to="/catalog" className="btn btn-primary">
              В каталог
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cart-page">
      <div className="container">
        <h1>Оформление заказа</h1>

        <div className="cart-layout">
          {/* ФОРМА */}
          <form onSubmit={handleSubmit} className="cart-form">
            <h2 className="cart-form__title">Контактные данные</h2>

            <div className="cart-form__row">
              <label className="cart-form__field">
                <span className="cart-form__label">ФИО получателя *</span>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={update('full_name')}
                  className="cart-form__input"
                />
              </label>
              <label className="cart-form__field">
                <span className="cart-form__label">Телефон *</span>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={update('phone')}
                  className="cart-form__input"
                  placeholder="+7 (999) 123-45-67"
                />
              </label>
            </div>

            <h2 className="cart-form__title">Доставка</h2>

            <label className="cart-form__field">
              <span className="cart-form__label">Адрес доставки *</span>
              <input
                type="text"
                required
                value={form.delivery_address}
                onChange={update('delivery_address')}
                className="cart-form__input"
                placeholder="Город, улица, дом, квартира"
              />
            </label>

            <div className="cart-form__row">
              <label className="cart-form__field">
                <span className="cart-form__label">Дата *</span>
                <input
                  type="date"
                  required
                  value={form.delivery_date}
                  onChange={update('delivery_date')}
                  min={today}
                  className="cart-form__input"
                />
              </label>
              <label className="cart-form__field">
                <span className="cart-form__label">Время *</span>
                <select
                  required
                  value={form.delivery_time}
                  onChange={update('delivery_time')}
                  className="cart-form__input"
                >
                  {DELIVERY_TIMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="cart-form__field">
              <span className="cart-form__label">Комментарий к заказу</span>
              <textarea
                value={form.comment}
                onChange={update('comment')}
                className="cart-form__input cart-form__textarea"
                rows={3}
                placeholder="Пожелания к букету или доставке"
              />
            </label>

            {error && <p className="cart-form__error">{error}</p>}

            <button
              type="submit"
              className="btn btn-primary cart-form__submit"
              disabled={submitting}
            >
              {submitting ? 'Оформляем…' : `Оформить заказ · ${Math.round(cart.total_price)} ₽`}
            </button>

            <p className="cart-form__note">
              Нажимая кнопку, вы соглашаетесь с обработкой персональных данных.
              Оплата при получении.
            </p>
          </form>

          {/* СВОДКА */}
          <aside className="cart-summary">
            <h3>Ваш заказ</h3>
            <div className="cart-summary__items">
              {cart.items.map((item) => (
                <div key={item.id} className="summary-item">
                  <div className="summary-item__image">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name} />
                    ) : (
                      <div className="summary-item__placeholder" />
                    )}
                  </div>
                  <div className="summary-item__info">
                    <p className="summary-item__name">{item.product.name}</p>
                    <div className="summary-item__controls">
                      <div className="qty">
                        <button
                          type="button"
                          className="qty__btn"
                          onClick={() => updateItem(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="qty__value">{item.quantity}</span>
                        <button
                          type="button"
                          className="qty__btn"
                          onClick={() => updateItem(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="summary-item__remove"
                        onClick={() => removeItem(item.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <p className="summary-item__price">
                    {Math.round(item.subtotal)} ₽
                  </p>
                </div>
              ))}
            </div>

            <div className="cart-summary__total">
              <span>Итого</span>
              <span className="cart-summary__total-value">
                {Math.round(cart.total_price)} ₽
              </span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
