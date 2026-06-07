import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import ProductCard from '../components/ProductCard'
import './Home.css'

/* ===========================
   ДАННЫЕ
   =========================== */

const OCCASIONS = [
  { key: 'birthday', label: 'День рождения' },
  { key: 'wedding', label: 'Свадьба' },
  { key: 'anniversary', label: 'Годовщина' },
  { key: 'no_occasion', label: 'Без повода' },
]

const SERVICES = [
  {
    title: 'Персональная флористика',
    text: 'Учитываем ваши пожелания и создаём индивидуальные композиции с использованием классических, экзотических и фермерских цветов',
  },
  {
    title: 'Доставка',
    text: 'Удобное время и место — бережная транспортировка, чтобы ваши цветы остались свежими',
  },
  {
    title: 'Упаковка',
    text: 'Лёгкая упаковка из небелёного пергамента и летящих лент подчёркивает красоту цветов, не перебивая её',
  },
]

const STEPS = [
  { n: '01', title: 'Выберите повод', text: 'День рождения, свадьба, годовщина — подберём букет под событие' },
  { n: '02', title: 'Соберите букет', text: 'Перетаскивайте цветы на холст или доверьте подбор нам' },
  { n: '03', title: 'Оформите заказ', text: 'Добавьте букет в корзину и выберите удобную доставку' },
]

/* ===========================
   HERO — Видео-фон
   =========================== */

function HeroSection() {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    video.play().catch(() => {})
  }, [])

  return (
    <section className="hero-video">
      <video
        ref={videoRef}
        className="hero-video__bg"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="/hero/hero-video.mp4" type="video/mp4" />
      </video>
      <div className="hero-video__overlay" />
      <div className="hero-video__content">
        <h1 className="hero-video__title">FloralMatch</h1>
        <p className="hero-video__subtitle">Авторские букеты в наличии и под заказ</p>
        <div className="hero-video__actions">
          <Link to="/constructor" className="btn btn-primary btn--lg">
            Собрать букет
          </Link>
          <Link to="/catalog" className="btn btn-secondary btn--lg hero-video__btn-light">
            Смотреть каталог
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ===========================
   ГАЛЕРЕЯ с навигацией
   =========================== */

function Gallery({ items, perPage = 2 }) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(items.length / perPage)
  const visible = items.slice(page * perPage, page * perPage + perPage)

  if (items.length === 0) return null

  return (
    <div className="gallery">
      <div className="gallery__grid" style={{ gridTemplateColumns: `repeat(${perPage}, 1fr)` }}>
        {visible.map((item) => (
          <Link key={item.id} to={`/product/${item.id}`} className="gallery__item">
            <img src={item.image_url} alt={item.name} />
          </Link>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="gallery__nav">
          <button
            className="gallery__arrow"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            &#8592;
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`gallery__dot ${page === i ? 'gallery__dot--active' : ''}`}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="gallery__arrow"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
          >
            &#8594;
          </button>
        </div>
      )}
    </div>
  )
}

/* ===========================
   ГЛАВНАЯ СТРАНИЦА
   =========================== */

export default function Home() {
  const [bouquets, setBouquets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/products', { params: { product_type: 'bouquet', per_page: 50 } })
      .then((res) => setBouquets(res.data.items))
      .finally(() => setLoading(false))
  }, [])

  // Конкретные букеты для секции "поводы"
  const OCCASION_BOUQUET_NAMES = ['Букет-подарок 5', 'Букет 5', 'Романтичный букет 1', 'Букет-подарок 8']
  const occasionPhotos = OCCASION_BOUQUET_NAMES
    .map((name) => bouquets.find((b) => b.name === name))
    .filter(Boolean)

  return (
    <div className="home">
      <HeroSection />

      {/* 1. БУКЕТЫ ДЛЯ ЛЮБОГО ПОВОДА */}
      <section className="section">
        <div className="container">
          <div className="section__header section__header--center">
            <h2>Букеты для любого повода</h2>
            <p className="section__subtitle">Подберём идеальную композицию под ваше событие</p>
          </div>

          {!loading && occasionPhotos.length > 0 && (
            <div className="occasions-scatter">
              {occasionPhotos.map((b, i) => (
                <Link
                  key={b.id}
                  to={`/product/${b.id}`}
                  className={`occasions-scatter__item occasions-scatter__item--${i + 1}`}
                >
                  <img src={b.image_url} alt={b.name} />
                </Link>
              ))}
            </div>
          )}

          <div className="occasions-links">
            {OCCASIONS.map((o) => (
              <Link key={o.key} to={`/catalog?occasion=${o.key}`} className="occasions-links__item">
                {o.label} &#8594;
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 2. УСЛУГИ */}
      <section className="section section--muted">
        <div className="container">
          <div className="services">
            {SERVICES.map((s, i) => (
              <div key={i} className="service-item">
                <h3 className="service-item__title">{s.title}</h3>
                <p className="service-item__text">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. КОНСТРУКТОР — шаги + CTA */}
      <section className="section">
        <div className="container">
          <div className="constructor-block">
            <div className="constructor-block__header">
              <h2>Соберите свой букет</h2>
              <p className="section__subtitle">Три простых шага до идеального букета</p>
            </div>

            <div className="steps">
              {STEPS.map((s) => (
                <div key={s.n} className="step-card">
                  <div className="step-card__number">{s.n}</div>
                  <h3 className="step-card__title">{s.title}</h3>
                  <p className="step-card__text">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="constructor-block__actions">
              <Link to="/constructor" className="btn btn-primary">
                Открыть конструктор
              </Link>
              <Link to="/constructor?mode=auto" className="btn btn-secondary">
                Подобрать автоматически
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ПРИМЕРЫ РАБОТ */}
      <section className="section section--muted">
        <div className="container">
          <div className="section__header">
            <h2>Примеры работ</h2>
            <Link to="/catalog?product_type=bouquet" className="section__link">
              Все букеты &#8594;
            </Link>
          </div>
          {loading && <p className="section__status">Загрузка...</p>}
          {!loading && <Gallery items={bouquets.slice(0, 9)} perPage={3} />}
        </div>
      </section>
    </div>
  )
}
