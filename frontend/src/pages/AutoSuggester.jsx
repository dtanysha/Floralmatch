import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import { useCart } from '../context/CartContext'
import './AutoSuggester.css'

const COLORS = [
  { key: 'белый', label: 'Белый', hex: '#FFFFFF' },
  { key: 'розовый', label: 'Розовый', hex: '#F06292' },
  { key: 'красный', label: 'Красный', hex: '#E53935' },
  { key: 'жёлтый', label: 'Жёлтый', hex: '#FDD835' },
  { key: 'оранжевый', label: 'Оранжевый', hex: '#FB8C00' },
  { key: 'фиолетовый', label: 'Фиолетовый', hex: '#8E24AA' },
  { key: 'голубой', label: 'Голубой', hex: '#81D4FA' },
  { key: 'зелёный', label: 'Зелёный', hex: '#66BB6A' },
]

const TYPES = [
  'роза', 'кустовая роза', 'гортензия', 'пион', 'гербера',
  'тюльпан', 'эустома', 'диантус', 'ранункулус',
  'хризантема', 'кустовая хризантема', 'гипсофила', 'эвкалипт',
]

const OCCASIONS = [
  { key: 'wedding', label: 'Свадьба' },
  { key: 'birthday', label: 'День рождения' },
  { key: 'anniversary', label: 'Годовщина' },
  { key: 'no_occasion', label: 'Без повода' },
]

export default function AutoSuggester() {
  const { addItem, openPanel } = useCart()
  const [searchParams, setSearchParams] = useSearchParams()

  const [bouquets, setBouquets] = useState([])
  const [loading, setLoading] = useState(true)

  // Единые фильтры (используются и AI, и ручными чипами)
  const [selectedTypes, setSelectedTypes] = useState(() => {
    const t = searchParams.get('types')
    return t ? t.split(',') : []
  })
  const [selectedColors, setSelectedColors] = useState(() => {
    const c = searchParams.get('colors')
    return c ? c.split(',') : []
  })
  const [selectedOccasion, setSelectedOccasion] = useState(
    () => searchParams.get('occasion') || ''
  )

  // AI: только состояние ввода/загрузки + последний запрос для отображения в плашке
  const [aiQuery, setAiQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiAppliedQuery, setAiAppliedQuery] = useState('') // последний успешный запрос — для плашки

  const handleAiSearch = async () => {
    const q = aiQuery.trim()
    if (q.length < 2) return
    setAiLoading(true)
    setAiError('')
    try {
      const res = await api.post('/constructor/ai-extract', { query: q })
      const { types = [], colors = [], occasion = null } = res.data
      // AI просто записывает значения в общие фильтры — чипы автоматически подсветятся
      setSelectedTypes(types)
      setSelectedColors(colors)
      setSelectedOccasion(occasion || '')
      setAiAppliedQuery(q)
    } catch (err) {
      let msg
      if (err?.response?.data?.detail) {
        msg = err.response.data.detail
      } else if (!err?.response) {
        msg = 'Не удалось связаться с сервером. Проверьте, что бэкенд запущен (uvicorn).'
      } else {
        msg = 'AI-поиск временно недоступен. Воспользуйтесь фильтрами вручную.'
      }
      setAiError(msg)
    } finally {
      setAiLoading(false)
    }
  }

  const handleAiKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAiSearch()
    }
  }

  useEffect(() => {
    api
      .get('/products', { params: { product_type: 'bouquet', in_stock: true, per_page: 100 } })
      .then((res) => setBouquets(res.data.items))
      .finally(() => setLoading(false))
  }, [])

  // Синхронизация фильтров в URL
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (selectedTypes.length > 0) next.set('types', selectedTypes.join(','))
    else next.delete('types')
    if (selectedColors.length > 0) next.set('colors', selectedColors.join(','))
    else next.delete('colors')
    if (selectedOccasion) next.set('occasion', selectedOccasion)
    else next.delete('occasion')
    setSearchParams(next, { replace: true })
  }, [selectedTypes, selectedColors, selectedOccasion])

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

  const toggleOccasion = (key) => {
    setSelectedOccasion((prev) => (prev === key ? '' : key))
  }

  // Единая мягкая логика: все условия — И между собой, внутри типов и цветов — ИЛИ
  const filtered = useMemo(() => {
    const noFilters = !selectedTypes.length && !selectedColors.length && !selectedOccasion
    if (noFilters) return bouquets

    return bouquets.filter((b) => {
      const comp = b.composition || []

      if (selectedOccasion) {
        const occs = b.occasions || []
        if (!occs.includes(selectedOccasion)) return false
      }
      if (selectedTypes.length > 0) {
        const hasType = comp.some((item) => selectedTypes.includes(item.flower_type))
        if (!hasType) return false
      }
      if (selectedColors.length > 0) {
        const hasColor = comp.some((item) => selectedColors.includes(item.flower_color))
        if (!hasColor) return false
      }
      return true
    })
  }, [bouquets, selectedTypes, selectedColors, selectedOccasion])

  const handleAddToCart = async (bouquet) => {
    try {
      await addItem(bouquet.id, 1)
      openPanel()
    } catch {
      // ошибка обработается в CartContext
    }
  }

  const hasFilters = selectedTypes.length > 0 || selectedColors.length > 0 || !!selectedOccasion

  const resetFilters = () => {
    setSelectedTypes([])
    setSelectedColors([])
    setSelectedOccasion('')
    setAiAppliedQuery('')
    setAiQuery('')
    setAiError('')
  }

  const occasionLabel = OCCASIONS.find((o) => o.key === selectedOccasion)?.label

  return (
    <div className="as">
      {/* AI-ПОИСК */}
      <div className="as__ai">
        <div className="container">
          <div className="as__ai-inner">
            <div className="as__ai-head">
              <h3 className="as__ai-title">Опишите букет словами</h3>
              <p className="as__ai-hint">
                Например: «Нежный букет роз» или «Яркий букет на день рождения». AI выставит фильтры —
                их можно доуточнить вручную ниже.
              </p>
            </div>
            <div className="as__ai-form">
              <textarea
                className="as__ai-input"
                rows={2}
                placeholder="Опишите желаемый букет..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={handleAiKeyDown}
                maxLength={300}
                disabled={aiLoading}
              />
              <button
                className="as__ai-btn"
                onClick={handleAiSearch}
                disabled={aiLoading || aiQuery.trim().length < 2}
              >
                {aiLoading ? 'Подбираем...' : 'Подобрать через AI'}
              </button>
            </div>
            {aiError && <p className="as__ai-error">{aiError}</p>}

            {aiAppliedQuery && !aiError && (
              <p className="as__ai-applied-note">
                {hasFilters
                  ? <>AI распознал запрос <i>«{aiAppliedQuery}»</i> и выставил фильтры ниже.</>
                  : <>AI не нашёл конкретных фильтров в запросе <i>«{aiAppliedQuery}»</i> — показаны все букеты.</>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ФИЛЬТРЫ */}
      <div className="as__filters">
        <div className="container">
          <div className="as__filters-inner">
            {/* Повод */}
            <div className="as__filter-block">
              <h4 className="as__filter-label">Повод</h4>
              <div className="as__chips">
                {OCCASIONS.map((o) => (
                  <button
                    key={o.key}
                    className={`as__chip ${selectedOccasion === o.key ? 'as__chip--active' : ''}`}
                    onClick={() => toggleOccasion(o.key)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Тип цветка */}
            <div className="as__filter-block">
              <h4 className="as__filter-label">Тип цветка</h4>
              <div className="as__chips">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    className={`as__chip ${selectedTypes.includes(t) ? 'as__chip--active' : ''}`}
                    onClick={() => toggleType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Цвет */}
            <div className="as__filter-block">
              <h4 className="as__filter-label">Цвет</h4>
              <div className="as__swatches">
                {COLORS.map((c) => (
                  <button
                    key={c.key}
                    className={`as__swatch ${selectedColors.includes(c.key) ? 'as__swatch--active' : ''}`}
                    onClick={() => toggleColor(c.key)}
                    title={c.label}
                  >
                    <span className="as__swatch-inner" style={{ background: c.hex }} />
                    {selectedColors.includes(c.key) && (
                      <span className="as__swatch-check">&#10003;</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {hasFilters && (
              <button className="as__reset" onClick={resetFilters}>
                Сбросить всё
              </button>
            )}
          </div>
        </div>
      </div>

      {/* РЕЗУЛЬТАТЫ */}
      <div className="container">
        <div className="as__results">
          {loading && <p className="as__status">Загрузка...</p>}

          {!loading && bouquets.length === 0 && (
            <p className="as__status">Букеты пока не добавлены</p>
          )}

          {!loading && bouquets.length > 0 && filtered.length === 0 && (
            <div className="as__empty">
              <p className="as__empty-title">К сожалению, по таким параметрам букетов нет</p>
              <p className="as__empty-hint">
                Попробуйте поменять цвет, тип цветка или повод — или описать букет другими словами.
              </p>
              <div className="as__empty-actions">
                <button className="as__empty-btn as__empty-btn--primary" onClick={resetFilters}>
                  Сбросить фильтры
                </button>
              </div>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <>
              <p className="as__count">
                {hasFilters
                  ? `Найдено: ${filtered.length}${occasionLabel ? ` • повод: ${occasionLabel}` : ''}`
                  : `Все букеты: ${filtered.length}`}
              </p>
              <div className="as__grid">
                {filtered.map((b) => (
                  <Link key={b.id} to={`/product/${b.id}`} className="as__card">
                    <div className="as__card-img">
                      {b.image_url ? (
                        <img src={b.image_url} alt={b.name} />
                      ) : (
                        <div className="as__card-placeholder">Нет фото</div>
                      )}
                    </div>
                    <div className="as__card-body">
                      <h3 className="as__card-name">{b.name}</h3>
                      {b.composition && (
                        <div className="as__card-composition">
                          {b.composition.map((item, i) => (
                            <span key={i} className="as__card-tag">
                              {item.flower_type} {item.flower_color}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="as__card-footer">
                        <span className="as__card-price">{Math.round(b.price)} &#8381;</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
