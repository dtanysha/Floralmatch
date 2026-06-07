import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import html2canvas from 'html2canvas'
import api from '../api/client'
import { useCart } from '../context/CartContext'
import FloristTips from '../components/FloristTips'
import './VisualConstructor.css'

// Цвета, которые показываем на фильтре.
// Первые 4 показываются сразу, остальные под "Ещё".
const COLORS_PRIMARY = [
  { key: 'белый', label: 'Белый', hex: '#FFFFFF' },
  { key: 'розовый', label: 'Розовый', hex: '#F06292' },
  { key: 'красный', label: 'Красный', hex: '#E53935' },
  { key: 'жёлтый', label: 'Жёлтый', hex: '#FDD835' },
]

const COLORS_EXTRA = [
  { key: 'оранжевый', label: 'Оранжевый', hex: '#FB8C00' },
  { key: 'фиолетовый', label: 'Фиолетовый', hex: '#8E24AA' },
  { key: 'голубой', label: 'Голубой', hex: '#81D4FA' },
  { key: 'зелёный', label: 'Зелёный', hex: '#66BB6A' },
]

const ALL_COLORS = [...COLORS_PRIMARY, ...COLORS_EXTRA]

// Типы цветков, показываемые сразу. Остальное грузим из /constructor/options.
const TYPES_PRIMARY_COUNT = 5

const WRAPPING_OPTIONS = [
  { key: 'none', label: 'Без упаковки' },
  { key: 'pink', label: 'Розовая', swatch: '#F2C4CE', border: '#E8A8B8', bg: 'linear-gradient(135deg, #FFF0F3 0%, #F9D5DE 100%)', img: '/constructor/wrap-pink.png' },
  { key: 'white', label: 'Белая', swatch: '#F5F0EB', border: '#E0D5CA', bg: 'linear-gradient(135deg, #FFFFFF 0%, #F5F0EB 100%)', img: '/constructor/wrap-white.png' },
  { key: 'kraft', label: 'Крафт', swatch: '#C4A882', border: '#B09570', bg: 'linear-gradient(135deg, #F0E4D4 0%, #D4BE9E 100%)', img: '/constructor/wrap-kraft.png' },
  { key: 'blue', label: 'Голубая', swatch: '#A8D8EA', border: '#7EC0D8', bg: 'linear-gradient(135deg, #EAF6FB 0%, #C4E6F3 100%)', img: '/constructor/wrap-blue.png' },
  { key: 'yellow', label: 'Жёлтая', swatch: '#FDD835', border: '#E0C020', bg: 'linear-gradient(135deg, #FFFDE7 0%, #FFF59D 100%)', img: '/constructor/wrap-yellow.png' },
  { key: 'orange', label: 'Оранжевая', swatch: '#FF9800', border: '#E68A00', bg: 'linear-gradient(135deg, #FFF3E0 0%, #FFD9A0 100%)', img: '/constructor/wrap-orange.png' },
  { key: 'red', label: 'Красная', swatch: '#E53935', border: '#C62828', bg: 'linear-gradient(135deg, #FFEBEE 0%, #FFBAB8 100%)', img: '/constructor/wrap-red.png' },
  { key: 'purple', label: 'Фиолетовая', swatch: '#B39DDB', border: '#9575CD', bg: 'linear-gradient(135deg, #F3E5F5 0%, #D1C4E9 100%)', img: '/constructor/wrap-purple.png' },
  { key: 'black', label: 'Чёрная', swatch: '#424242', border: '#212121', bg: 'linear-gradient(135deg, #F5F5F5 0%, #BDBDBD 100%)', img: '/constructor/wrap-black.png' },
  { key: 'green', label: 'Зелёная', swatch: '#80CBC4', border: '#4DB6AC', bg: 'linear-gradient(135deg, #E0F2F1 0%, #B2DFDB 100%)', img: '/constructor/wrap-green.png' },
]

const RIBBON_ALL = [
  { key: 'none', label: 'Без ленты' },
  { key: 'ribbon-pink', label: 'Розовая', swatch: '#F2C4CE' },
  { key: 'ribbon-white', label: 'Белая', swatch: '#F5F0EB' },
  { key: 'ribbon-kraft', label: 'Крафт', swatch: '#C4A882' },
  { key: 'ribbon-blue', label: 'Голубая', swatch: '#A8D8EA' },
  { key: 'ribbon-yellow', label: 'Жёлтая', swatch: '#FDD835' },
  { key: 'ribbon-orange', label: 'Оранжевая', swatch: '#FF9800' },
  { key: 'ribbon-red', label: 'Красная', swatch: '#E53935' },
  { key: 'ribbon-purple', label: 'Фиолетовая', swatch: '#B39DDB' },
  { key: 'ribbon-black', label: 'Чёрная', swatch: '#424242' },
  { key: 'ribbon-green', label: 'Зелёная', swatch: '#80CBC4' },
  { key: 'ribbon-gold', label: 'Золотая', swatch: '#D4A843' },
  { key: 'ribbon-silver', label: 'Серебристая', swatch: '#B0BEC5' },
]

const WRAPPING_PRICE = 200

// Маппинг ключа упаковки → image_url товара в БД
const WRAPPING_IMAGE_MAP = {
  pink: '/constructor/wrap-pink.png',
  white: '/constructor/wrap-white.png',
  kraft: '/constructor/wrap-kraft.png',
  blue: '/constructor/wrap-blue.png',
  yellow: '/constructor/wrap-yellow.png',
  orange: '/constructor/wrap-orange.png',
  red: '/constructor/wrap-red.png',
  purple: '/constructor/wrap-purple.png',
  black: '/constructor/wrap-black.png',
  green: '/constructor/wrap-green.png',
}

let nextId = 1

export default function VisualConstructor() {
  const { addItem, openPanel } = useCart()
  const canvasRef = useRef(null)

  const [flowers, setFlowers] = useState([])
  const [loading, setLoading] = useState(true)

  // Опции из API
  const [allTypes, setAllTypes] = useState([])
  const [wrappingProducts, setWrappingProducts] = useState([])

  // Фильтры
  const [search, setSearch] = useState('')
  const [selectedTypes, setSelectedTypes] = useState([])
  const [selectedColors, setSelectedColors] = useState([])
  const [showAllTypes, setShowAllTypes] = useState(false)
  const [showAllColors, setShowAllColors] = useState(false)

  // Холст
  const [bouquet, setBouquet] = useState([])
  const [selectedCanvasId, setSelectedCanvasId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  // Упаковка и лента
  const [wrapping, setWrapping] = useState('none')
  const [ribbon, setRibbon] = useState('none') // 'none' | 'contrast' | 'match'
  const [showWrapping, setShowWrapping] = useState(false)
  const [showRibbon, setShowRibbon] = useState(false)

  // Загрузка цветов и опций
  useEffect(() => {
    api
      .get('/products', { params: { product_type: 'flower', in_stock: true, per_page: 100 } })
      .then((res) => setFlowers(res.data.items))
      .finally(() => setLoading(false))

    api
      .get('/constructor/options')
      .then((res) => setAllTypes(res.data.flower_types || []))
      .catch(() => setAllTypes([]))

    api
      .get('/products', { params: { product_type: 'wrapping', in_stock: true, per_page: 10 } })
      .then((res) => setWrappingProducts(res.data.items || []))
      .catch(() => setWrappingProducts([]))
  }, [])

  // Фильтрация цветов по поиску + типу + цвету
  const filteredFlowers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return flowers.filter((f) => {
      if (q) {
        const hay = `${f.name} ${f.flower_type || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (selectedTypes.length > 0 && !selectedTypes.includes(f.flower_type)) {
        return false
      }
      if (selectedColors.length > 0 && !selectedColors.includes(f.flower_color)) {
        return false
      }
      return true
    })
  }, [flowers, search, selectedTypes, selectedColors])

  // Toggle helpers
  const toggleType = (t) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
  }
  const toggleColor = (c) => {
    setSelectedColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    )
  }

  const typesToShow = showAllTypes ? allTypes : allTypes.slice(0, TYPES_PRIMARY_COUNT)
  const colorsToShow = showAllColors ? ALL_COLORS : COLORS_PRIMARY

  // Добавить цветок на холст
  const addToCanvas = useCallback((product) => {
    const spreadX = -60 + Math.random() * 120
    const baseY = -60 + Math.random() * 60
    const rotate = -25 + Math.random() * 50

    setBouquet((prev) => [
      ...prev,
      {
        id: nextId++,
        productId: product.id,
        product,
        x: spreadX,
        y: baseY,
        rotate,
        scale: 1,
      },
    ])
  }, [])

  const duplicateFlower = useCallback((item) => {
    setBouquet((prev) => [
      ...prev,
      {
        ...item,
        id: nextId++,
        x: item.x + 20 + Math.random() * 20,
        y: item.y - 10 + Math.random() * 20,
        rotate: item.rotate + (-10 + Math.random() * 20),
      },
    ])
  }, [])

  // Управление слоями: переместить цветок в конец массива (на передний план) или в начало (на задний).
  const bringToFront = useCallback((id) => {
    setBouquet((prev) => {
      const idx = prev.findIndex((f) => f.id === id)
      if (idx === -1 || idx === prev.length - 1) return prev
      const item = prev[idx]
      const rest = prev.filter((f) => f.id !== id)
      return [...rest, item]
    })
  }, [])

  const sendToBack = useCallback((id) => {
    setBouquet((prev) => {
      const idx = prev.findIndex((f) => f.id === id)
      if (idx === -1 || idx === 0) return prev
      const item = prev[idx]
      const rest = prev.filter((f) => f.id !== id)
      return [item, ...rest]
    })
  }, [])

  // Ручной DRAG — перемещение цветка по холсту
  const handleDragStart = useCallback((e, item) => {
    e.preventDefault()

    const startX = e.clientX
    const startY = e.clientY
    const origX = item.x
    const origY = item.y

    const onMove = (ev) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      setBouquet((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, x: origX + dx, y: origY + dy } : f))
      )
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // Единый контрол — вращение + масштаб за правый верхний угол
  const handleTransformStart = useCallback((e, item) => {
    e.preventDefault()
    e.stopPropagation()

    const flowerEl = e.target.closest('.vc__canvas-flower')
    if (!flowerEl) return
    const rect = flowerEl.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI)
    const startRotate = item.rotate
    const startDist = Math.max(
      Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2),
      1
    )
    const startScale = item.scale || 1

    const onMove = (ev) => {
      const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI)
      const dist = Math.sqrt((ev.clientX - cx) ** 2 + (ev.clientY - cy) ** 2)
      const newScale = Math.min(2.5, Math.max(0.3, startScale * (dist / startDist)))
      const newRotate = startRotate + (angle - startAngle)
      setBouquet((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, rotate: newRotate, scale: newScale } : f))
      )
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const removeFlower = useCallback((id) => {
    setBouquet((prev) => prev.filter((item) => item.id !== id))
    setSelectedCanvasId((prev) => (prev === id ? null : prev))
  }, [])

  const clearCanvas = useCallback(() => {
    setBouquet([])
    setSelectedCanvasId(null)
  }, [])

  // Подсчёт итого
  const summary = useMemo(() => {
    const grouped = {}
    bouquet.forEach((item) => {
      if (!grouped[item.productId]) {
        grouped[item.productId] = { product: item.product, quantity: 0 }
      }
      grouped[item.productId].quantity += 1
    })
    const items = Object.values(grouped)
    const flowersTotal = items.reduce((sum, g) => sum + g.product.price * g.quantity, 0)
    const wrappingTotal = wrapping !== 'none' ? WRAPPING_PRICE : 0
    const total = flowersTotal + wrappingTotal
    return { items, total, wrappingTotal }
  }, [bouquet, wrapping])

  const handleAddToCart = async () => {
    if (bouquet.length === 0) return
    setAdding(true)
    try {
      // Скриншот канваса
      if (canvasRef.current) {
        try {
          setSelectedCanvasId(null) // убрать выделение перед скриншотом
          // Ждём ре-рендер, чтобы убрались контролы выделения
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
          const canvas = await html2canvas(canvasRef.current, {
            backgroundColor: '#FAF8F6',
            useCORS: true,
            scale: 1,
          })
          const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, 'image/png')
          )
          if (blob) {
            const formData = new FormData()
            formData.append('file', blob, 'bouquet-screenshot.png')
            const uploadRes = await api.post('/orders/upload-screenshot', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
            localStorage.setItem('constructor_image_url', uploadRes.data.url)
          }
        } catch (err) {
          console.warn('Screenshot failed:', err)
        }
      }

      for (const { product, quantity } of summary.items) {
        await addItem(product.id, quantity)
      }

      // Добавляем упаковку в корзину как товар
      if (wrapping !== 'none') {
        const wrapImg = WRAPPING_IMAGE_MAP[wrapping]
        const wrapProduct = wrappingProducts.find((p) => p.image_url === wrapImg)
        if (wrapProduct) {
          await addItem(wrapProduct.id, 1)
        }
      }
      setAdded(true)
      setTimeout(() => setAdded(false), 2500)
      openPanel()
    } catch {
      // ошибка обработается в CartContext
    } finally {
      setAdding(false)
    }
  }

  // Горячие клавиши: Delete/Backspace, Cmd+C, Cmd+V
  const clipboardRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Не перехватываем если фокус в input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCanvasId) {
        e.preventDefault()
        removeFlower(selectedCanvasId)
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedCanvasId) {
        const item = bouquet.find((f) => f.id === selectedCanvasId)
        if (item) clipboardRef.current = item
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboardRef.current) {
        e.preventDefault()
        duplicateFlower(clipboardRef.current)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCanvasId, bouquet, removeFlower, duplicateFlower])

  // Логика взаимодействия с цветком:
  //   - не-выделенный цветок: клик выделяет; зажал и тянешь — выделяет и сразу тащит.
  //   - выделенный цветок: зажал и тянешь — тащит этот же; чистый клик без перемещения
  //     переключает на следующий цветок в стопке наложенных (циклично, по кругу).
  // "Клик vs drag" определяем по расстоянию мыши с момента mousedown: < 5px = клик.
  const DRAG_THRESHOLD_PX = 5

  const handleFlowerClick = useCallback((e, item) => {
    if (e.target.closest('.vc__canvas-flower-actions') || e.target.closest('.vc__bbox-transform')) return
    e.preventDefault()

    const startX = e.clientX
    const startY = e.clientY
    const wasSelected = selectedCanvasId === item.id

    // Если кликнули на ещё не выделенный — выделяем сразу (для мгновенной реакции UI).
    // Если уже выделен — пока ничего не делаем, ждём mousemove/mouseup.
    if (!wasSelected) {
      setSelectedCanvasId(item.id)
    }

    let dragStarted = false

    const onMove = (ev) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      const moved = Math.hypot(dx, dy) > DRAG_THRESHOLD_PX
      if (!moved || dragStarted) return
      dragStarted = true
      // Передаём управление в стандартный drag — он сам слушает дальнейший mousemove.
      handleDragStart(ev, item)
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (dragStarted) return // было перетаскивание — переключение не нужно

      // Чистый клик. Если кликнули по уже выделенному — переключаем по кругу через
      // стопку наложенных. Берём все цветы что геометрически близко (включая текущий),
      // сортируем по порядку в массиве (визуально снизу вверх) и идём к следующему.
      if (!wasSelected) return

      const stack = bouquet.filter((f) => {
        const dxx = Math.abs(f.x - item.x)
        const dyy = Math.abs(f.y - item.y)
        return dxx < 80 && dyy < 80
      })
      if (stack.length <= 1) return
      const here = stack.findIndex((f) => f.id === item.id)
      const next = stack[(here + 1) % stack.length]
      setSelectedCanvasId(next.id)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [selectedCanvasId, bouquet, handleDragStart])

  const hasActiveFilters = search || selectedTypes.length > 0 || selectedColors.length > 0

  const resetFilters = () => {
    setSearch('')
    setSelectedTypes([])
    setSelectedColors([])
  }

  return (
    <div className="vc">
      {/* ЛЕВАЯ ПАНЕЛЬ — ЦВЕТЫ */}
      <aside className="vc__panel">
        <h3 className="vc__panel-title">Цветы</h3>

        {/* Поиск */}
        <input
          type="text"
          className="vc__search"
          placeholder="Поиск: роза, гербера..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Фильтр по типу */}
        {allTypes.length > 0 && (
          <div className="vc__filter-block">
            <h4 className="vc__filter-label">Тип цветка</h4>
            <div className="vc__filters">
              {typesToShow.map((t) => (
                <button
                  key={t}
                  className={`vc__filter-chip ${selectedTypes.includes(t) ? 'vc__filter-chip--active' : ''}`}
                  onClick={() => toggleType(t)}
                >
                  {t}
                </button>
              ))}
              {allTypes.length > TYPES_PRIMARY_COUNT && (
                <button
                  className="vc__filter-chip vc__filter-chip--more"
                  onClick={() => setShowAllTypes(!showAllTypes)}
                >
                  {showAllTypes ? '× Свернуть' : '▼ Ещё'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Фильтр по цвету */}
        <div className="vc__filter-block">
          <h4 className="vc__filter-label">Цвет</h4>
          <div className="vc__swatches">
            {colorsToShow.map((c) => (
              <button
                key={c.key}
                className={`vc__swatch ${selectedColors.includes(c.key) ? 'vc__swatch--active' : ''}`}
                onClick={() => toggleColor(c.key)}
                title={c.label}
                aria-label={c.label}
              >
                <span className="vc__swatch-inner" style={{ background: c.hex }} />
                {selectedColors.includes(c.key) && (
                  <span className="vc__swatch-check">✓</span>
                )}
              </button>
            ))}
            <button
              className="vc__swatch vc__swatch--more"
              onClick={() => setShowAllColors(!showAllColors)}
              title={showAllColors ? 'Свернуть' : 'Ещё'}
            >
              {showAllColors ? '×' : '▼'}
            </button>
          </div>
        </div>

        {hasActiveFilters && (
          <button className="vc__reset" onClick={resetFilters}>
            Сбросить фильтры
          </button>
        )}

        {/* Список цветов */}
        <div className="vc__flower-list">
          {loading && <p className="vc__status">Загрузка...</p>}
          {!loading && flowers.length === 0 && (
            <p className="vc__status">
              Пока нет цветов. Добавьте их через seed-скрипт.
            </p>
          )}
          {!loading && flowers.length > 0 && filteredFlowers.length === 0 && (
            <p className="vc__status">Ничего не найдено</p>
          )}
          {filteredFlowers.map((flower) => (
            <button
              key={flower.id}
              className="vc__flower-card"
              onClick={() => addToCanvas(flower)}
            >
              {flower.image_url ? (
                <img
                  src={flower.image_url}
                  alt={flower.name}
                  className="vc__flower-img"
                />
              ) : (
                <div className="vc__flower-placeholder">
                  {flower.name.charAt(0)}
                </div>
              )}
              <div className="vc__flower-info">
                <span className="vc__flower-name">{flower.name}</span>
                {flower.flower_color && (
                  <span className="vc__flower-color">цвет: {flower.flower_color}</span>
                )}
                <span className="vc__flower-price">{flower.price} ₽</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ХОЛСТ */}
      <div className="vc__canvas-wrap">
        <div
          className="vc__canvas"
          ref={canvasRef}
          onClick={(e) => {
            // Клик по пустому месту — снять выделение
            if (e.target === e.currentTarget) setSelectedCanvasId(null)
          }}
        >
          {/* Подсказки флориста — иконка в углу холста + выезжающая панель */}
          <FloristTips bouquet={bouquet} />
          {bouquet.map((item) => (
            <div
              key={item.id}
              className={`vc__canvas-flower ${
                selectedCanvasId === item.id ? 'vc__canvas-flower--selected' : ''
              }`}
              style={{
                left: '50%',
                top: '40%',
                transform: `translate(calc(-50% + ${item.x}px), calc(-50% + ${item.y}px)) rotate(${item.rotate}deg) scale(${item.scale || 1})`,
              }}
              onMouseDown={(e) => handleFlowerClick(e, item)}
            >
              {item.product.image_url ? (
                <img
                  src={item.product.image_url}
                  alt={item.product.name}
                  className="vc__canvas-flower-img"
                />
              ) : (
                <div className="vc__canvas-flower-placeholder">
                  {item.product.name.charAt(0)}
                </div>
              )}
              <div className="vc__canvas-flower-actions">
                <button onClick={() => bringToFront(item.id)} title="На передний план">⤒</button>
                <button onClick={() => sendToBack(item.id)} title="На задний план">⤓</button>
                <button onClick={() => duplicateFlower(item)} title="Дублировать">+</button>
                <button onClick={() => removeFlower(item.id)} title="Удалить">×</button>
              </div>
              {/* Рамка + единый контрол в правом верхнем углу */}
              <div className="vc__bbox">
                <div
                  className="vc__bbox-transform"
                  onMouseDown={(e) => handleTransformStart(e, item)}
                  title="Вращать / масштабировать"
                >
                  ↻
                </div>
                <div className="vc__bbox-corner vc__bbox-corner--tl" />
                <div className="vc__bbox-corner vc__bbox-corner--bl" />
                <div className="vc__bbox-corner vc__bbox-corner--br" />
              </div>
            </div>
          ))}

          {/* Рамка упаковки */}
          {wrapping !== 'none' && (
            <div
              className="vc__wrap-frame"
              style={{
                '--wrap-border': WRAPPING_OPTIONS.find(w => w.key === wrapping)?.border,
                '--wrap-bg': WRAPPING_OPTIONS.find(w => w.key === wrapping)?.bg,
              }}
            />
          )}

          {/* Подсказка */}
          {bouquet.length === 0 && wrapping === 'none' && (
            <p className="vc__canvas-hint">
              Нажмите на цветок слева, чтобы добавить
            </p>
          )}
        </div>

        {/* Выбор упаковки и ленты — раскрывающиеся панели */}
        <div className="vc__options">
          <div className="vc__accordion">
            <button className="vc__accordion-header" onClick={() => setShowWrapping(!showWrapping)}>
              <span>Упаковка{wrapping !== 'none' ? `: ${WRAPPING_OPTIONS.find(w => w.key === wrapping)?.label}` : ''}</span>
              <span className={`vc__accordion-arrow ${showWrapping ? 'vc__accordion-arrow--open' : ''}`}>▾</span>
            </button>
            {showWrapping && (
              <div className="vc__accordion-body">
                <div className="vc__option-buttons">
                  {WRAPPING_OPTIONS.map((w) => (
                    <button
                      key={w.key}
                      className={`vc__option-btn ${wrapping === w.key ? 'vc__option-btn--active' : ''}`}
                      onClick={() => setWrapping(w.key)}
                    >
                      {w.swatch && <span className="vc__option-swatch" style={{ background: w.swatch }} />}
                      {w.label}
                      {w.key !== 'none' && <span className="vc__option-price">+{WRAPPING_PRICE} ₽</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="vc__accordion">
            <button className="vc__accordion-header" onClick={() => setShowRibbon(!showRibbon)}>
              <span>Лента{ribbon !== 'none' ? `: ${RIBBON_ALL.find(r => r.key === ribbon)?.label || ribbon}` : ''}</span>
              <span className={`vc__accordion-arrow ${showRibbon ? 'vc__accordion-arrow--open' : ''}`}>▾</span>
            </button>
            {showRibbon && (
              <div className="vc__accordion-body">
                <div className="vc__option-buttons">
                  {RIBBON_ALL.map((r) => (
                    <button
                      key={r.key}
                      className={`vc__option-btn ${ribbon === r.key ? 'vc__option-btn--active' : ''}`}
                      onClick={() => setRibbon(r.key)}
                    >
                      {r.swatch && <span className="vc__option-swatch" style={{ background: r.swatch }} />}
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {bouquet.length > 0 && (
          <button onClick={clearCanvas} className="vc__clear-btn">
            Очистить
          </button>
        )}
      </div>

      {/* ПРАВАЯ ПАНЕЛЬ — ИТОГО */}
      <aside className="vc__summary">
        <h3 className="vc__summary-title">Ваш букет</h3>

        {summary.items.length === 0 ? (
          <p className="vc__status">Пока пусто</p>
        ) : (
          <>
            <div className="vc__summary-list">
              {summary.items.map(({ product, quantity }) => (
                <div key={product.id} className="vc__summary-item">
                  <span className="vc__summary-name">{product.name}</span>
                  <span className="vc__summary-qty">× {quantity}</span>
                  <span className="vc__summary-price">
                    {Math.round(product.price * quantity)} ₽
                  </span>
                </div>
              ))}
            </div>

            {summary.wrappingTotal > 0 && (
              <div className="vc__summary-item">
                <span className="vc__summary-name">Упаковка</span>
                <span className="vc__summary-qty"></span>
                <span className="vc__summary-price">{summary.wrappingTotal} ₽</span>
              </div>
            )}

            <div className="vc__summary-total">
              <span>Итого</span>
              <span className="vc__summary-total-price">
                {Math.round(summary.total)} ₽
              </span>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={adding}
              className="btn btn-primary vc__cart-btn"
            >
              {adding ? 'Добавляем...' : added ? 'Добавлено ✓' : 'В корзину'}
            </button>
          </>
        )}
      </aside>
    </div>
  )
}
