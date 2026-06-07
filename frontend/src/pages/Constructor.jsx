import { useSearchParams } from 'react-router-dom'
import VisualConstructor from './VisualConstructor'
import AutoSuggester from './AutoSuggester'
import './Constructor.css'

export default function Constructor() {
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get('mode') === 'auto' ? 'auto' : 'visual'

  const setMode = (newMode) => {
    const next = new URLSearchParams(searchParams)
    if (newMode === 'auto') {
      next.set('mode', 'auto')
    } else {
      next.delete('mode')
      // Очищаем фильтры автоподборщика
      next.delete('types')
      next.delete('colors')
    }
    setSearchParams(next)
  }

  return (
    <div>
      <div className="constructor">
        <div className="container">
          <div className="constructor__intro">
            <h1>Конструктор букетов</h1>
            <p className="constructor__subtitle">
              {mode === 'visual'
                ? 'Соберите свой букет: выберите цветы слева, перетащите их на холст'
                : 'Выберите тип и цвет цветов — мы подберём готовые букеты'}
            </p>
          </div>
          <div className="constructor__mode-toggle">
            <button
              className={`constructor__mode-btn ${mode === 'visual' ? 'constructor__mode-btn--active' : ''}`}
              onClick={() => setMode('visual')}
            >
              Собрать визуально
            </button>
            <button
              className={`constructor__mode-btn ${mode === 'auto' ? 'constructor__mode-btn--active' : ''}`}
              onClick={() => setMode('auto')}
            >
              Подобрать автоматически
            </button>
          </div>
        </div>
      </div>
      {mode === 'visual' ? <VisualConstructor /> : <AutoSuggester />}
    </div>
  )
}
