import { useState, useEffect, useCallback } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import api from '../api/client'
import './Header.css'

const navLinks = [
  { to: '/catalog', label: 'Каталог' },
  { to: '/constructor', label: 'Конструктор' },
  { to: '/favorites', label: 'Избранное' },
]

export default function Header() {
  const { user, logout } = useAuth()
  const { itemsCount, openPanel } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const [newOrdersCount, setNewOrdersCount] = useState(0)

  const fetchNewOrders = useCallback(() => {
    if (!user?.is_admin) return
    api.get('/admin/orders/new-count').then((res) => {
      setNewOrdersCount(res.data.count)
    }).catch(() => {})
  }, [user])

  useEffect(() => {
    fetchNewOrders()
    if (!user?.is_admin) return
    const interval = setInterval(fetchNewOrders, 30000)
    return () => clearInterval(interval)
  }, [fetchNewOrders, user])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="header__logo" onClick={closeMenu}>
          FloralMatch
        </Link>

        <nav className="header__nav">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive ? 'header__link header__link--active' : 'header__link'
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="header__actions">
          {user ? (
            <>
              <Link to="/profile" className="header__action header__action--desktop">
                {user.full_name?.split(' ')[0] || 'Профиль'}
              </Link>
              <button onClick={logout} className="header__action header__logout header__action--desktop">
                Выйти
              </button>
            </>
          ) : (
            <Link to="/login" className="header__action header__action--desktop">
              Войти
            </Link>
          )}
          {user?.is_admin && (
            <Link to="/admin" className="header__admin" aria-label="Админ-панель">
              <span className="header__admin-icon">&#9881;</span>
              {newOrdersCount > 0 && (
                <span className="header__badge header__badge--admin">{newOrdersCount}</span>
              )}
            </Link>
          )}
          <button onClick={openPanel} className="header__cart" aria-label="Корзина">
            <span className="header__cart-text">Корзина</span>
            <span className="header__cart-icon">🛒</span>
            {itemsCount > 0 && <span className="header__badge">{itemsCount}</span>}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="header__burger"
            aria-label="Меню"
          >
            <span className={`burger ${menuOpen ? 'burger--open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>
      </div>

      {/* МОБИЛЬНОЕ МЕНЮ */}
      <div className={`mobile-menu ${menuOpen ? 'mobile-menu--open' : ''}`}>
        <nav className="mobile-menu__nav">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={closeMenu}
              className={({ isActive }) =>
                isActive ? 'mobile-menu__link mobile-menu__link--active' : 'mobile-menu__link'
              }
            >
              {link.label}
            </NavLink>
          ))}
          <div className="mobile-menu__divider" />
          {user ? (
            <>
              <NavLink
                to="/profile"
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? 'mobile-menu__link mobile-menu__link--active' : 'mobile-menu__link'
                }
              >
                Профиль
              </NavLink>
              <button
                onClick={() => {
                  logout()
                  closeMenu()
                }}
                className="mobile-menu__link mobile-menu__link--button"
              >
                Выйти
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              onClick={closeMenu}
              className={({ isActive }) =>
                isActive ? 'mobile-menu__link mobile-menu__link--active' : 'mobile-menu__link'
              }
            >
              Войти
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  )
}
