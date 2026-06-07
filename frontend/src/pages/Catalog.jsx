import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/client'
import ProductCard from '../components/ProductCard'
import './Catalog.css'

const TYPES = [
  { key: '', label: 'Все' },
  { key: 'bouquet', label: 'Букеты' },
  { key: 'flower', label: 'Цветы' },
]

const OCCASIONS = [
  { key: 'birthday', label: 'День рождения' },
  { key: 'wedding', label: 'Свадьба' },
  { key: 'anniversary', label: 'Годовщина' },
  { key: 'no_occasion', label: 'Без повода' },
]

const FLOWER_COLORS = [
  { key: 'белый', label: 'Белый' },
  { key: 'розовый', label: 'Розовый' },
  { key: 'красный', label: 'Красный' },
  { key: 'жёлтый', label: 'Жёлтый' },
  { key: 'оранжевый', label: 'Оранжевый' },
  { key: 'фиолетовый', label: 'Фиолетовый' },
  { key: 'голубой', label: 'Голубой' },
  { key: 'зелёный', label: 'Зелёный' },
]

const FLOWER_TYPES = [
  { key: 'роза', label: 'Роза' },
  { key: 'кустовая роза', label: 'Кустовая роза' },
  { key: 'гортензия', label: 'Гортензия' },
  { key: 'пион', label: 'Пион' },
  { key: 'гербера', label: 'Гербера' },
  { key: 'тюльпан', label: 'Тюльпан' },
  { key: 'эустома', label: 'Эустома' },
  { key: 'диантус', label: 'Диантус' },
  { key: 'ранункулус', label: 'Ранункулус' },
  { key: 'хризантема', label: 'Хризантема' },
  { key: 'кустовая хризантема', label: 'Кустовая хризантема' },
]

const SIZES = [
  { key: 'small', label: 'Маленький' },
  { key: 'medium', label: 'Средний' },
  { key: 'large', label: 'Большой' },
]

const PER_PAGE = 12

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [availableFlowerTypes, setAvailableFlowerTypes] = useState(FLOWER_TYPES)
  const [availableFlowerColors, setAvailableFlowerColors] = useState(FLOWER_COLORS)

  const productType = searchParams.get('product_type') || ''
  const occasion = searchParams.get('occasion') || ''
  const flowerType = searchParams.get('flower_type') || ''
  const flowerColor = searchParams.get('flower_color') || ''
  const size = searchParams.get('size') || ''
  const priceMin = searchParams.get('price_min') || ''
  const priceMax = searchParams.get('price_max') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)

  // Подгружаем доступные типы цветков при смене типа товара или повода
  useEffect(() => {
    const params = {}
    if (productType) params.product_type = productType
    if (occasion) params.occasion = occasion

    api
      .get('/products/available-flower-types', { params })
      .then((res) => {
        const available = res.data
        const filtered = FLOWER_TYPES.filter((ft) => available.includes(ft.key))
        setAvailableFlowerTypes(filtered.length > 0 ? filtered : FLOWER_TYPES)
      })
      .catch(() => setAvailableFlowerTypes(FLOWER_TYPES))
  }, [productType, occasion])

  // Подгружаем доступные цвета при смене фильтров
  useEffect(() => {
    const params = {}
    if (productType) params.product_type = productType
    if (occasion) params.occasion = occasion
    if (flowerType) params.flower_type = flowerType

    api
      .get('/products/available-flower-colors', { params })
      .then((res) => {
        const available = res.data
        const filtered = FLOWER_COLORS.filter((fc) => available.includes(fc.key))
        setAvailableFlowerColors(filtered.length > 0 ? filtered : FLOWER_COLORS)
      })
      .catch(() => setAvailableFlowerColors(FLOWER_COLORS))
  }, [productType, occasion, flowerType])

  // Сбрасываем тип цветка, если он больше не доступен
  useEffect(() => {
    if (flowerType && availableFlowerTypes.length > 0) {
      const stillAvailable = availableFlowerTypes.some((ft) => ft.key === flowerType)
      if (!stillAvailable) {
        updateFilter('flower_type', '')
      }
    }
  }, [availableFlowerTypes])

  // Сбрасываем цвет, если он больше не доступен
  useEffect(() => {
    if (flowerColor && availableFlowerColors.length > 0) {
      const stillAvailable = availableFlowerColors.some((fc) => fc.key === flowerColor)
      if (!stillAvailable) {
        updateFilter('flower_color', '')
      }
    }
  }, [availableFlowerColors])

  useEffect(() => {
    setLoading(true)
    setError(null)

    const params = { page, per_page: PER_PAGE }
    if (productType) params.product_type = productType
    if (occasion) params.occasion = occasion
    if (flowerType) params.flower_type = flowerType
    if (flowerColor) params.flower_color = flowerColor
    if (size) params.size = size
    if (priceMin) params.price_min = priceMin
    if (priceMax) params.price_max = priceMax

    api
      .get('/products', { params })
      .then((res) => {
        setProducts(res.data.items)
        setTotal(res.data.total)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [productType, occasion, flowerType, flowerColor, size, priceMin, priceMax, page])

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    // При выборе "Цветы" сбрасываем повод и размер
    if (key === 'product_type' && value === 'flower') {
      next.delete('occasion')
      next.delete('size')
    }
    next.delete('page')
    setSearchParams(next)
  }

  const resetFilters = () => {
    setSearchParams({})
  }

  const goToPage = (p) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(p))
    setSearchParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const hasActiveFilters =
    productType || occasion || flowerType || flowerColor || size || priceMin || priceMax

  return (
    <div className="catalog">
      <div className="container">
        <div className="catalog__header">
          <h1>Каталог</h1>
          <p className="catalog__count">
            {loading ? 'Загрузка…' : `Найдено: ${total}`}
          </p>
        </div>

        <div className="catalog__layout">
          {/* ФИЛЬТРЫ */}
          <aside className="filters">
            <FilterGroup
              title="Тип"
              options={TYPES}
              value={productType}
              onChange={(v) => updateFilter('product_type', v)}
              allowClear={false}
            />
            {productType !== 'flower' && (
              <FilterGroup
                title="Повод"
                options={OCCASIONS}
                value={occasion}
                onChange={(v) => updateFilter('occasion', v)}
              />
            )}
            <FilterGroup
              title="Тип цветка"
              options={availableFlowerTypes}
              value={flowerType}
              onChange={(v) => updateFilter('flower_type', v)}
            />
            <FilterGroup
              title="Цвет"
              options={availableFlowerColors}
              value={flowerColor}
              onChange={(v) => updateFilter('flower_color', v)}
            />
            {productType !== 'flower' && (
              <FilterGroup
                title="Размер"
                options={SIZES}
                value={size}
                onChange={(v) => updateFilter('size', v)}
              />
            )}

            <div className="filter-group">
              <h4 className="filter-group__title">Цена, ₽</h4>
              <div className="filter-price">
                <input
                  type="number"
                  placeholder="От"
                  value={priceMin}
                  onChange={(e) => updateFilter('price_min', e.target.value)}
                  className="filter-price__input"
                  min="0"
                />
                <input
                  type="number"
                  placeholder="До"
                  value={priceMax}
                  onChange={(e) => updateFilter('price_max', e.target.value)}
                  className="filter-price__input"
                  min="0"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button onClick={resetFilters} className="filters__reset">
                Сбросить фильтры
              </button>
            )}
          </aside>

          {/* РЕЗУЛЬТАТЫ */}
          <div className="catalog__results">
            {error && (
              <p className="catalog__status">Не удалось загрузить товары</p>
            )}

            {!error && !loading && products.length === 0 && (
              <p className="catalog__status">
                По выбранным фильтрам ничего не найдено
              </p>
            )}

            {!error && products.length > 0 && (
              <>
                <div className="catalog__grid">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} selectedSize={size} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterGroup({ title, options, value, onChange, allowClear = true }) {
  return (
    <div className="filter-group">
      <h4 className="filter-group__title">{title}</h4>
      <div className="filter-group__options">
        {allowClear && (
          <button
            type="button"
            className={`filter-chip ${value === '' ? 'filter-chip--active' : ''}`}
            onClick={() => onChange('')}
          >
            Все
          </button>
        )}
        {options.map((o) => (
          <button
            key={o.key || 'all'}
            type="button"
            className={`filter-chip ${value === o.key ? 'filter-chip--active' : ''}`}
            onClick={() => onChange(o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, onPageChange }) {
  const pages = []
  for (let i = 1; i <= totalPages; i++) pages.push(i)
  return (
    <div className="pagination">
      <button
        className="pagination__btn"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
      >
        ←
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={`pagination__btn ${p === page ? 'pagination__btn--active' : ''}`}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        className="pagination__btn"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
      >
        →
      </button>
    </div>
  )
}
