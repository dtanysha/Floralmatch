import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import './CartPanel.css'

export default function CartPanel() {
  const { cart, panelOpen, closePanel, updateItem, removeItem } = useCart()

  useEffect(() => {
    if (panelOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [panelOpen])

  const handleQtyChange = async (itemId, qty) => {
    if (qty < 1) return
    await updateItem(itemId, qty)
  }

  return (
    <>
      <div
        className={`cart-overlay ${panelOpen ? 'cart-overlay--open' : ''}`}
        onClick={closePanel}
      />
      <aside className={`cart-panel ${panelOpen ? 'cart-panel--open' : ''}`}>
        <div className="cart-panel__header">
          <h3>Корзина</h3>
          <button onClick={closePanel} className="cart-panel__close" aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="cart-panel__body">
          {cart.items.length === 0 ? (
            <div className="cart-panel__empty">
              <p>Корзина пуста</p>
              <Link to="/catalog" className="btn btn-primary" onClick={closePanel}>
                В каталог
              </Link>
            </div>
          ) : (
            <div className="cart-panel__items">
              {cart.items.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item__image">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name} />
                    ) : (
                      <div className="cart-item__placeholder" />
                    )}
                  </div>
                  <div className="cart-item__info">
                    <Link
                      to={`/product/${item.product.id}`}
                      className="cart-item__name"
                      onClick={closePanel}
                    >
                      {item.product.name}
                    </Link>
                    <p className="cart-item__price">
                      {Math.round(item.product.price)} ₽
                    </p>
                    <div className="cart-item__controls">
                      <div className="qty">
                        <button
                          className="qty__btn"
                          onClick={() => handleQtyChange(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="qty__value">{item.quantity}</span>
                        <button
                          className="qty__btn"
                          onClick={() => handleQtyChange(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="cart-item__remove"
                        onClick={() => removeItem(item.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="cart-panel__footer">
            <div className="cart-panel__total">
              <span>Итого</span>
              <span className="cart-panel__total-value">
                {Math.round(cart.total_price)} ₽
              </span>
            </div>
            <Link
              to="/cart"
              className="btn btn-primary cart-panel__checkout"
              onClick={closePanel}
            >
              Оформить заказ
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
