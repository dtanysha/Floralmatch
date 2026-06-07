import { useEffect, useState, useCallback } from 'react'
import api from '../api/client'
import './Admin.css'

const STATUSES = [
  { key: 'new', label: 'Новый' },
  { key: 'confirmed', label: 'Подтверждён' },
  { key: 'assembling', label: 'Собирается' },
  { key: 'ready', label: 'Готов' },
  { key: 'delivering', label: 'В доставке' },
  { key: 'completed', label: 'Выполнен' },
  { key: 'cancelled', label: 'Отменён' },
]

const STATUS_LABELS = Object.fromEntries(STATUSES.map((s) => [s.key, s.label]))

const OCCASIONS_OPTIONS = [
  { key: 'birthday', label: 'День рождения' },
  { key: 'wedding', label: 'Свадьба' },
  { key: 'anniversary', label: 'Годовщина' },
  { key: 'no_occasion', label: 'Без повода' },
]

export default function Admin() {
  const [tab, setTab] = useState('orders')

  return (
    <div className="admin">
      <div className="container">
        <h1 className="admin__title">Админ-панель</h1>
        <div className="admin__tabs">
          <button
            className={`admin__tab ${tab === 'orders' ? 'admin__tab--active' : ''}`}
            onClick={() => setTab('orders')}
          >
            Заказы
          </button>
          <button
            className={`admin__tab ${tab === 'products' ? 'admin__tab--active' : ''}`}
            onClick={() => setTab('products')}
          >
            Товары
          </button>
          <button
            className={`admin__tab ${tab === 'users' ? 'admin__tab--active' : ''}`}
            onClick={() => setTab('users')}
          >
            Пользователи
          </button>
        </div>

        {tab === 'orders' && <OrdersTab />}
        {tab === 'products' && <ProductsTab />}
        {tab === 'users' && <UsersTab />}
      </div>
    </div>
  )
}

/* ===========================
   ВКЛАДКА ЗАКАЗЫ
   =========================== */

function OrdersTab() {
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const perPage = 20

  const fetchOrders = useCallback(() => {
    setLoading(true)
    const params = { page, per_page: perPage }
    if (statusFilter) params.status = statusFilter
    api
      .get('/admin/orders', { params })
      .then((res) => {
        setOrders(res.data.items)
        setTotal(res.data.total)
      })
      .finally(() => setLoading(false))
  }, [page, statusFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const changeStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: newStatus })
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      )
    } catch {
      alert('Ошибка при смене статуса')
    }
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="admin__section">
      <div className="admin__filters">
        <button
          className={`admin__filter-btn ${statusFilter === '' ? 'admin__filter-btn--active' : ''}`}
          onClick={() => { setStatusFilter(''); setPage(1) }}
        >
          Все
        </button>
        {STATUSES.map((s) => (
          <button
            key={s.key}
            className={`admin__filter-btn ${statusFilter === s.key ? 'admin__filter-btn--active' : ''}`}
            onClick={() => { setStatusFilter(s.key); setPage(1) }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && <p className="admin__status">Загрузка...</p>}

      {!loading && orders.length === 0 && (
        <p className="admin__status">Заказов нет</p>
      )}

      {!loading && orders.length > 0 && (
        <div className="admin__orders">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div
                className="order-card__header"
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
              >
                <span className="order-card__id">#{order.id}</span>
                <span className="order-card__name">{order.full_name}</span>
                <span className="order-card__date">
                  {new Date(order.delivery_date).toLocaleDateString('ru-RU')} {order.delivery_time}
                </span>
                <span className="order-card__total">{Math.round(order.total_price)} &#8381;</span>
                <select
                  className={`order-card__status order-card__status--${order.status}`}
                  value={order.status}
                  onChange={(e) => changeStatus(order.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
                <span className="order-card__toggle">{expandedId === order.id ? '▲' : '▼'}</span>
              </div>

              {expandedId === order.id && (
                <div className="order-card__details">
                  {order.image_url && (
                    <div className="order-card__screenshot">
                      <img src={order.image_url} alt={`Заказ #${order.id}`} />
                    </div>
                  )}
                  <div className="order-card__items">
                    {order.items.map((item) => (
                      <div key={item.id} className="order-card__item">
                        <span>{item.product?.name || `Товар #${item.product_id}`}{item.product?.flower_color ? ` (${item.product.flower_color})` : ''}</span>
                        <span>x{item.quantity}</span>
                        <span>{Math.round(item.price_at_purchase * item.quantity)} &#8381;</span>
                      </div>
                    ))}
                  </div>
                  <div className="order-card__info">
                    <p><strong>Телефон:</strong> {order.phone}</p>
                    <p><strong>Адрес:</strong> {order.delivery_address}</p>
                    {order.comment && <p><strong>Комментарий:</strong> {order.comment}</p>}
                    <p className="order-card__created">
                      Создан: {new Date(order.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {totalPages > 1 && (
            <div className="admin__pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>&#8592;</button>
              <span>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>&#8594;</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ===========================
   ВКЛАДКА ТОВАРЫ
   =========================== */

function ProductsTab() {
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | product object
  const perPage = 20

  const fetchProducts = useCallback(() => {
    setLoading(true)
    api
      .get('/products', { params: { per_page: perPage, page } })
      .then((res) => {
        setProducts(res.data.items)
        setTotal(res.data.total)
      })
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleDelete = async (id) => {
    if (!confirm('Удалить товар?')) return
    try {
      await api.delete(`/admin/products/${id}`)
      fetchProducts()
    } catch {
      alert('Ошибка при удалении')
    }
  }

  const handleSaved = () => {
    setEditing(null)
    fetchProducts()
  }

  const totalPages = Math.ceil(total / perPage)

  if (editing !== null) {
    return (
      <ProductForm
        product={editing === 'new' ? null : editing}
        onSaved={handleSaved}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="admin__section">
      <button className="btn btn-primary admin__add-btn" onClick={() => setEditing('new')}>
        + Добавить товар
      </button>

      {loading && <p className="admin__status">Загрузка...</p>}

      {!loading && products.length === 0 && (
        <p className="admin__status">Товаров нет</p>
      )}

      {!loading && products.length > 0 && (
        <>
          <div className="admin__products-table">
            <div className="admin__table-header">
              <span>Фото</span>
              <span>Название</span>
              <span>Тип</span>
              <span>Цена</span>
              <span>Наличие</span>
              <span>Действия</span>
            </div>
            {products.map((p) => (
              <div key={p.id} className="admin__table-row">
                <span className="admin__table-photo">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} />
                  ) : (
                    <div className="admin__table-no-photo">-</div>
                  )}
                </span>
                <span className="admin__table-name">{p.name}</span>
                <span>{p.product_type === 'bouquet' ? 'Букет' : p.product_type === 'wrapping' ? 'Упаковка' : 'Цветок'}</span>
                <span>
                  {p.sizes
                    ? `${Math.round(p.sizes.small?.price || p.price)} – ${Math.round(p.sizes.large?.price || p.price)} ₽`
                    : `${Math.round(p.price)} ₽`}
                </span>
                <span>{p.in_stock ? 'Да' : 'Нет'}</span>
                <span className="admin__table-actions">
                  <button onClick={() => setEditing(p)} title="Редактировать">&#9998;</button>
                  <button onClick={() => handleDelete(p.id)} title="Удалить">&#10005;</button>
                </span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="admin__pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>&#8592;</button>
              <span>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>&#8594;</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ===========================
   ФОРМА ТОВАРА
   =========================== */

function ProductForm({ product, onSaved, onCancel }) {
  const isNew = !product
  const [form, setForm] = useState({
    name: product?.name || '',
    product_type: product?.product_type || 'bouquet',
    price: product?.price || '',
    image_url: product?.image_url || '',
    flower_type: product?.flower_type || '',
    flower_color: product?.flower_color || '',
    description: product?.description || '',
    care_tips: product?.care_tips || '',
    occasions: product?.occasions || [],
    in_stock: product?.in_stock ?? true,
    composition: product?.composition || [],
    sizes: product?.sizes || null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const updateCheck = (key) => (e) => setForm({ ...form, [key]: e.target.checked })

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/admin/upload', fd)
      setForm({ ...form, image_url: res.data.url })
    } catch {
      alert('Ошибка загрузки')
    } finally {
      setUploading(false)
    }
  }

  const toggleOccasion = (key) => {
    setForm((prev) => ({
      ...prev,
      occasions: prev.occasions.includes(key)
        ? prev.occasions.filter((o) => o !== key)
        : [...prev.occasions, key],
    }))
  }

  // Composition management
  const addCompItem = () => {
    setForm((prev) => ({
      ...prev,
      composition: [...prev.composition, { flower_type: '', flower_color: '' }],
    }))
  }

  const updateCompItem = (idx, field, value) => {
    setForm((prev) => ({
      ...prev,
      composition: prev.composition.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeCompItem = (idx) => {
    setForm((prev) => ({
      ...prev,
      composition: prev.composition.filter((_, i) => i !== idx),
    }))
  }

  // Sizes management
  const toggleSizes = (enabled) => {
    setForm((prev) => ({
      ...prev,
      sizes: enabled
        ? { small: { price: '', quantities: [] }, medium: { price: '', quantities: [] }, large: { price: '', quantities: [] } }
        : null,
    }))
  }

  const updateSizePrice = (sizeKey, value) => {
    setForm((prev) => ({
      ...prev,
      sizes: { ...prev.sizes, [sizeKey]: { ...prev.sizes[sizeKey], price: value } },
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const body = { ...form }
    if (body.price) body.price = parseFloat(body.price)
    if (!body.flower_type) body.flower_type = null
    if (!body.flower_color) body.flower_color = null
    if (!body.description) body.description = null
    if (!body.care_tips) body.care_tips = null
    if (!body.image_url) body.image_url = null
    if (body.composition.length === 0) body.composition = null
    if (body.occasions.length === 0) body.occasions = null

    // Clean sizes
    if (body.sizes) {
      const cleaned = {}
      for (const [k, v] of Object.entries(body.sizes)) {
        if (v.price) {
          cleaned[k] = { ...v, price: parseFloat(v.price) }
        }
      }
      body.sizes = Object.keys(cleaned).length > 0 ? cleaned : null
    }

    try {
      if (isNew) {
        await api.post('/admin/products', body)
      } else {
        await api.put(`/admin/products/${product.id}`, body)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin__section">
      <h2 className="admin__form-title">{isNew ? 'Новый товар' : `Редактирование: ${product.name}`}</h2>

      <form className="admin__form" onSubmit={handleSubmit}>
        {error && <div className="admin__form-error">{error}</div>}

        <div className="admin__form-row">
          <div className="admin__form-field">
            <label>Название</label>
            <input value={form.name} onChange={update('name')} required />
          </div>
          <div className="admin__form-field">
            <label>Тип</label>
            <select value={form.product_type} onChange={update('product_type')}>
              <option value="bouquet">Букет</option>
              <option value="flower">Цветок</option>
            </select>
          </div>
        </div>

        <div className="admin__form-row">
          <div className="admin__form-field">
            <label>Цена (базовая)</label>
            <input type="number" step="0.01" value={form.price} onChange={update('price')} required />
          </div>
          <div className="admin__form-field">
            <label>Наличие</label>
            <label className="admin__checkbox">
              <input type="checkbox" checked={form.in_stock} onChange={updateCheck('in_stock')} />
              В наличии
            </label>
          </div>
        </div>

        {form.product_type === 'flower' && (
          <div className="admin__form-row">
            <div className="admin__form-field">
              <label>Тип цветка</label>
              <input value={form.flower_type} onChange={update('flower_type')} placeholder="роза, гербера..." />
            </div>
            <div className="admin__form-field">
              <label>Цвет цветка</label>
              <input value={form.flower_color} onChange={update('flower_color')} placeholder="розовый, белый..." />
            </div>
          </div>
        )}

        <div className="admin__form-field">
          <label>Описание</label>
          <textarea value={form.description} onChange={update('description')} rows={3} />
        </div>

        <div className="admin__form-field">
          <label>Рекомендации по уходу</label>
          <textarea value={form.care_tips} onChange={update('care_tips')} rows={3} />
        </div>

        {/* Фото */}
        <div className="admin__form-field">
          <label>Фото</label>
          <div className="admin__upload-row">
            {form.image_url && (
              <img src={form.image_url} alt="preview" className="admin__upload-preview" />
            )}
            <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
            {uploading && <span>Загрузка...</span>}
          </div>
          <input
            value={form.image_url}
            onChange={update('image_url')}
            placeholder="Или вставьте URL вручную"
            className="admin__form-input-small"
          />
        </div>

        {/* Поводы */}
        <div className="admin__form-field">
          <label>Повод</label>
          <div className="admin__chips">
            {OCCASIONS_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                className={`admin__chip ${form.occasions.includes(o.key) ? 'admin__chip--active' : ''}`}
                onClick={() => toggleOccasion(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Состав букета */}
        {form.product_type === 'bouquet' && (
          <div className="admin__form-field">
            <label>Состав букета</label>
            {form.composition.map((item, i) => (
              <div key={i} className="admin__comp-row">
                <input
                  value={item.flower_type}
                  onChange={(e) => updateCompItem(i, 'flower_type', e.target.value)}
                  placeholder="Тип (роза...)"
                />
                <input
                  value={item.flower_color}
                  onChange={(e) => updateCompItem(i, 'flower_color', e.target.value)}
                  placeholder="Цвет (розовый...)"
                />
                <button type="button" onClick={() => removeCompItem(i)}>&#10005;</button>
              </div>
            ))}
            <button type="button" className="admin__comp-add" onClick={addCompItem}>
              + Добавить цветок
            </button>
          </div>
        )}

        {/* Размеры */}
        <div className="admin__form-field">
          <label>Размеры с ценами</label>
          <label className="admin__checkbox">
            <input type="checkbox" checked={!!form.sizes} onChange={(e) => toggleSizes(e.target.checked)} />
            Включить размеры (малый / средний / большой)
          </label>
          {form.sizes && (
            <div className="admin__sizes-grid">
              {['small', 'medium', 'large'].map((sk) => (
                <div key={sk} className="admin__size-field">
                  <span>{sk === 'small' ? 'Малый' : sk === 'medium' ? 'Средний' : 'Большой'}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.sizes[sk]?.price || ''}
                    onChange={(e) => updateSizePrice(sk, e.target.value)}
                    placeholder="Цена"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin__form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Сохранение...' : isNew ? 'Создать' : 'Сохранить'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Отмена
          </button>
        </div>
      </form>
    </div>
  )
}

/* ===========================
   ВКЛАДКА ПОЛЬЗОВАТЕЛИ
   =========================== */

function UsersTab() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const perPage = 20

  useEffect(() => {
    setLoading(true)
    api
      .get('/admin/users', { params: { page, per_page: perPage } })
      .then((res) => {
        setUsers(res.data.items)
        setTotal(res.data.total)
      })
      .finally(() => setLoading(false))
  }, [page])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="admin__section">
      {loading && <p className="admin__status">Загрузка...</p>}

      {!loading && users.length === 0 && (
        <p className="admin__status">Пользователей нет</p>
      )}

      {!loading && users.length > 0 && (
        <>
          <div className="admin__users-table">
            <div className="admin__table-header">
              <span>ID</span>
              <span>Email</span>
              <span>Имя</span>
              <span>Телефон</span>
              <span>Роль</span>
              <span>Регистрация</span>
            </div>
            {users.map((u) => (
              <div key={u.id} className="admin__table-row">
                <span>{u.id}</span>
                <span>{u.email}</span>
                <span>{u.full_name || '-'}</span>
                <span>{u.phone || '-'}</span>
                <span>{u.is_admin ? 'Админ' : 'Пользователь'}</span>
                <span>{new Date(u.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="admin__pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>&#8592;</button>
              <span>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>&#8594;</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
