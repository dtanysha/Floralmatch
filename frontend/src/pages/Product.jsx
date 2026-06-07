import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import { useNavigate } from 'react-router-dom'
import './Product.css'

const OCCASION_LABELS = {
  birthday: 'День рождения',
  wedding: 'Свадьба',
  anniversary: 'Годовщина',
  no_occasion: 'Без повода',
}

const SIZE_LABELS = {
  small: 'Маленький',
  medium: 'Средний',
  large: 'Большой',
}

const SIZE_ORDER = ['small', 'medium', 'large']

const TYPE_LABELS = {
  bouquet: 'Букет',
  flower: 'Цветок',
}

export default function Product() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { user } = useAuth()
  const { isFavorite, toggle } = useFavorites()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addingToCart, setAddingToCart] = useState(false)
  const [addedMessage, setAddedMessage] = useState('')
  const [selectedSize, setSelectedSize] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api
      .get(`/products/${id}`)
      .then((res) => {
        setProduct(res.data)
        // Устанавливаем размер по умолчанию
        if (res.data.sizes) {
          if (res.data.sizes.medium) setSelectedSize('medium')
          else if (res.data.sizes.small) setSelectedSize('small')
          else if (res.data.sizes.large) setSelectedSize('large')
        }
      })
      .catch((err) => {
        if (err.response?.status === 404) setError('Товар не найден')
        else setError('Не удалось загрузить товар')
      })
      .finally(() => setLoading(false))
  }, [id])

  // Доступные размеры
  const availableSizes = useMemo(() => {
    if (!product?.sizes) return []
    return SIZE_ORDER.filter((s) => product.sizes[s])
  }, [product])

  // Текущая цена в зависимости от размера
  const displayPrice = useMemo(() => {
    if (!product) return 0
    if (selectedSize && product.sizes?.[selectedSize]) {
      return product.sizes[selectedSize].price
    }
    return product.price
  }, [product, selectedSize])

  // Состав с количествами для выбранного размера
  const compositionText = useMemo(() => {
    if (!product?.composition || !product.composition.length) return null
    if (selectedSize && product.sizes?.[selectedSize]?.quantities) {
      const quantities = product.sizes[selectedSize].quantities
      return product.composition
        .map((c, i) => {
          const name = c.flower_type.charAt(0).toUpperCase() + c.flower_type.slice(1)
          const qty = quantities[i] || 1
          return `${name} x${qty}`
        })
        .join(', ')
    }
    // Без размеров — просто список
    return product.composition
      .map((c) => c.flower_type.charAt(0).toUpperCase() + c.flower_type.slice(1))
      .join(', ')
  }, [product, selectedSize])

  const handleAddToCart = async () => {
    setAddingToCart(true)
    setAddedMessage('')
    try {
      await addItem(product.id, 1)
      setAddedMessage('Добавлено в корзину')
      setTimeout(() => setAddedMessage(''), 2500)
    } catch {
      setAddedMessage('Ошибка при добавлении')
    } finally {
      setAddingToCart(false)
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 32px', textAlign: 'center' }}>
        Загрузка…
      </div>
    )
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '80px 32px', textAlign: 'center' }}>
        <h2>{error}</h2>
        <Link to="/catalog" className="btn btn-primary" style={{ marginTop: 24 }}>
          В каталог
        </Link>
      </div>
    )
  }

  return (
    <div className="product-page">
      <div className="container">
        <nav className="product-breadcrumbs">
          <Link to="/">Главная</Link> / <Link to="/catalog">Каталог</Link> /{' '}
          <span>{product.name}</span>
        </nav>

        <div className="product-layout">
          <div className="product-gallery-wrap">
            <div className={`product-gallery ${product.product_type === 'flower' ? 'product-gallery--flower' : ''}`}>
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} />
              ) : (
                <div className="product-gallery__placeholder">Фото товара</div>
              )}
            </div>
            {product.sizes && (
              <p className="product-gallery__note">*На фото представлен букет среднего размера</p>
            )}
          </div>

          <div className="product-info">
            <span className="product-info__type">
              {TYPE_LABELS[product.product_type] || product.product_type}
            </span>
            <h1 className="product-info__name">{product.name}</h1>
            <p className="product-info__price">{Math.round(displayPrice)} ₽</p>

            {availableSizes.length > 0 && (
              <div className="product-sizes">
                <span className="product-attr__label">Размер</span>
                <div className="product-sizes__buttons">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      className={`product-sizes__btn ${selectedSize === size ? 'product-sizes__btn--active' : ''}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {SIZE_LABELS[size]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.product_type === 'bouquet' && compositionText && (
              <div className="product-info__composition">
                <span className="product-attr__label">Состав</span>
                <p className="product-info__composition-text">{compositionText}</p>
              </div>
            )}

            {product.product_type !== 'bouquet' && product.description && (
              <p className="product-info__description">{product.description}</p>
            )}

            <div className="product-attrs">
              {product.flower_type && (
                <div className="product-attr">
                  <span className="product-attr__label">Вид</span>
                  <span className="product-attr__value">{product.flower_type}</span>
                </div>
              )}
              {product.flower_color && (
                <div className="product-attr">
                  <span className="product-attr__label">Цвет</span>
                  <span className="product-attr__value">{product.flower_color}</span>
                </div>
              )}
              {product.product_type === 'bouquet' && !product.sizes && product.size && (
                <div className="product-attr">
                  <span className="product-attr__label">Размер</span>
                  <span className="product-attr__value">
                    {SIZE_LABELS[product.size] || product.size}
                  </span>
                </div>
              )}
              {product.product_type === 'bouquet' && product.occasions && product.occasions.length > 0 && (
                <div className="product-attr">
                  <span className="product-attr__label">Повод</span>
                  <span className="product-attr__value">
                    {product.occasions
                      .map((o) => OCCASION_LABELS[o] || o)
                      .join(', ')}
                  </span>
                </div>
              )}
              <div className="product-attr">
                <span className="product-attr__label">Наличие</span>
                <span className="product-attr__value">
                  {product.in_stock ? 'В наличии' : 'Нет в наличии'}
                </span>
              </div>
            </div>

            <div className="product-actions">
              <div className="product-actions__row">
                <button
                  className="btn btn-primary product-actions__btn"
                  onClick={handleAddToCart}
                  disabled={!product.in_stock || addingToCart}
                >
                  {addingToCart ? 'Добавляем…' : 'В корзину'}
                </button>
                <button
                  className={`product-actions__fav ${isFavorite(product.id) ? 'product-actions__fav--active' : ''}`}
                  onClick={async () => {
                    if (!user) return navigate('/login')
                    try { await toggle(product.id) } catch {}
                  }}
                  aria-label="В избранное"
                >
                  {isFavorite(product.id) ? '♥' : '♡'}
                </button>
              </div>
              {addedMessage && (
                <p className="product-actions__message">{addedMessage}</p>
              )}
            </div>

            {product.care_tips && (
              <div className="product-care">
                <span className="product-care__label">Рекомендации по уходу</span>
                <p className="product-care__text">{product.care_tips}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
