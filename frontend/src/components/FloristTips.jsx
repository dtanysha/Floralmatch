import { useMemo, useState, useEffect } from 'react'
import { FLOWER_TIPS, getBouquetTips, getColorPalette } from '../data/floristTips'
import './FloristTips.css'

/**
 * FloristTips — кнопка-иконка в углу холста, открывает выезжающую боковую панель.
 * Две вкладки: "Ваш букет" (контекстные советы + цветовая гамма) и "Справочник".
 *
 * Props:
 *   bouquet — массив элементов { product: { flower_type, flower_color, ... } }
 */
export default function FloristTips({ bouquet = [] }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('bouquet')

  // Извлекаем типы и цвета цветов из букета
  const flowerTypes = useMemo(
    () => bouquet.map((item) => item.product?.flower_type).filter(Boolean),
    [bouquet]
  )

  const flowerColors = useMemo(
    () => bouquet.map((item) => item.product?.flower_color).filter(Boolean),
    [bouquet]
  )

  const tips = useMemo(() => getBouquetTips(flowerTypes), [flowerTypes])
  const palette = useMemo(() => getColorPalette(flowerColors), [flowerColors])
  const hasBouquet = flowerTypes.length > 0

  // Закрытие по Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // Сортированный список цветов для справочника
  const directory = useMemo(() => Object.entries(FLOWER_TIPS), [])

  return (
    <>
      {/* Иконка-кнопка в углу холста */}
      <button
        className={`florist-tips__icon-btn ${open ? 'florist-tips__icon-btn--active' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="Подсказки флориста"
        title="Подсказки флориста"
      >
        <span className="florist-tips__icon">💡</span>
        <span className="florist-tips__icon-label">Подсказки флориста</span>
      </button>

      {/* Затемнение фона при открытой панели */}
      {open && (
        <div
          className="florist-tips__backdrop"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Выезжающая панель справа */}
      <aside className={`florist-tips__drawer ${open ? 'florist-tips__drawer--open' : ''}`}>
        <header className="florist-tips__header">
          <h3 className="florist-tips__title">
            <span>💡</span> Подсказки флориста
          </h3>
          <button
            className="florist-tips__close"
            onClick={() => setOpen(false)}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </header>

        <div className="florist-tips__tabs">
          <button
            className={`florist-tips__tab ${tab === 'bouquet' ? 'florist-tips__tab--active' : ''}`}
            onClick={() => setTab('bouquet')}
          >
            Ваш букет
          </button>
          <button
            className={`florist-tips__tab ${tab === 'directory' ? 'florist-tips__tab--active' : ''}`}
            onClick={() => setTab('directory')}
          >
            Справочник
          </button>
        </div>

        <div className="florist-tips__content">
          {tab === 'bouquet' && (
            <div className="florist-tips__bouquet">
              {!hasBouquet && (
                <p className="florist-tips__empty">
                  Начните добавлять цветы на холст — здесь появятся персональные
                  советы по сочетаниям, цветовой гамме и уходу.
                </p>
              )}

              {hasBouquet && (
                <>
                  {tips.summary && (
                    <p className="florist-tips__summary">{tips.summary}</p>
                  )}

                  {/* Цветовая гамма */}
                  {palette.currentColors.length > 0 && (
                    <div className="florist-tips__section">
                      <h4 className="florist-tips__section-title">
                        🎨 Цветовая гамма
                      </h4>
                      <div className="florist-tips__palette">
                        <div className="florist-tips__palette-row">
                          <span className="florist-tips__palette-label">В букете:</span>
                          <div className="florist-tips__swatches">
                            {palette.currentColors.map((c) => (
                              <span
                                key={c.key}
                                className="florist-tips__swatch"
                                style={{ background: c.hex }}
                                title={c.label}
                              />
                            ))}
                          </div>
                        </div>

                        {palette.suggestions.length > 0 && (
                          <div className="florist-tips__palette-row">
                            <span className="florist-tips__palette-label">
                              Хорошо дополнят:
                            </span>
                            <div className="florist-tips__swatches">
                              {palette.suggestions.map((c) => (
                                <span
                                  key={c.key}
                                  className="florist-tips__swatch florist-tips__swatch--suggested"
                                  style={{ background: c.hex }}
                                  title={c.label}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {palette.harmony && (
                          <p className="florist-tips__palette-hint">
                            {palette.harmony}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Предупреждения о совместимости */}
                  {tips.warnings.length > 0 && (
                    <div className="florist-tips__section">
                      <h4 className="florist-tips__section-title">
                        ⚠️ Совместимость цветов
                      </h4>
                      <div className="florist-tips__warnings">
                        {tips.warnings.map((w, idx) => (
                          <div
                            key={idx}
                            className={`florist-tips__warning florist-tips__warning--${w.severity}`}
                          >
                            {w.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Чем можно дополнить */}
                  {tips.suggestions.length > 0 && (
                    <div className="florist-tips__section">
                      <h4 className="florist-tips__section-title">
                        ✨ Чем можно дополнить
                      </h4>
                      <ul className="florist-tips__list">
                        {tips.suggestions.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Мягкие парные советы (если есть) */}
                  {tips.careTips.length > 0 && (
                    <div className="florist-tips__section">
                      <h4 className="florist-tips__section-title">
                        💧 Особенности сочетания
                      </h4>
                      <ul className="florist-tips__list florist-tips__list--care">
                        {tips.careTips.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Уход за каждым цветком — карточки */}
                  {tips.flowerCareCards.length > 0 && (
                    <div className="florist-tips__section">
                      <h4 className="florist-tips__section-title">
                        🌿 Уход за цветами в букете
                      </h4>
                      <div className="florist-tips__care-cards">
                        {tips.flowerCareCards.map((c) => (
                          <article key={c.key} className="florist-tips__care-card">
                            <h5 className="florist-tips__care-card-title">{c.label}</h5>
                            <p className="florist-tips__care-card-desc">{c.description}</p>
                            <p className="florist-tips__care-card-care">
                              <strong>Уход:</strong> {c.care}
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'directory' && (
            <div className="florist-tips__directory">
              {directory.map(([key, info]) => (
                <article key={key} className="florist-tips__card">
                  <h4 className="florist-tips__card-title">{info.label}</h4>
                  <p className="florist-tips__card-desc">{info.description}</p>
                  {info.goodWith.length > 0 && (
                    <p className="florist-tips__card-line">
                      <strong>Хорошо сочетается с:</strong>{' '}
                      {info.goodWith
                        .map((f) => FLOWER_TIPS[f]?.label.toLowerCase() || f)
                        .join(', ')}
                    </p>
                  )}
                  <p className="florist-tips__card-line">
                    <strong>Уход:</strong> {info.care}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
