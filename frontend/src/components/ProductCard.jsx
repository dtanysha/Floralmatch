import { Link, useNavigate } from 'react-router-dom'
import { useFavorites } from '../context/FavoritesContext'
import { useAuth } from '../context/AuthContext'
import './ProductCard.css'

export default function ProductCard({ product, selectedSize }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isFavorite, toggle } = useFavorites()
  const active = isFavorite(product.id)

  const handleFav = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate('/login')
      return
    }
    try {
      await toggle(product.id)
    } catch {
      // игнорируем
    }
  }

  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <div className={`product-card__image ${product.product_type === 'flower' ? 'product-card__image--flower' : ''}`}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} />
        ) : (
          <div className="product-card__placeholder">Фото букета</div>
        )}
        <button
          type="button"
          onClick={handleFav}
          className={`product-card__fav ${active ? 'product-card__fav--active' : ''}`}
          aria-label={active ? 'Убрать из избранного' : 'В избранное'}
        >
          {active ? '♥' : '♡'}
        </button>
      </div>
      <div className="product-card__body">
        <h4 className="product-card__name">{product.name}</h4>
        {product.product_type === 'bouquet' && product.description && (
          <p className="product-card__composition">{product.description}</p>
        )}
        {product.product_type === 'flower' && product.flower_color && (
          <p className="product-card__color">цвет: {product.flower_color}</p>
        )}
        <p className="product-card__price">
          {product.sizes && selectedSize && product.sizes[selectedSize] ? (
            <>{Math.round(product.sizes[selectedSize].price)} ₽</>
          ) : product.sizes ? (
            <>от {Math.round(product.sizes.small?.price || product.sizes.medium?.price || product.price)} ₽</>
          ) : (
            <>{Math.round(product.price)} ₽</>
          )}
        </p>
      </div>
    </Link>
  )
}
