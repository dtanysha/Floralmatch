import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container" style={{ padding: '120px 32px', textAlign: 'center' }}>
      <h1>404</h1>
      <p style={{ marginTop: 16, color: 'var(--color-text-muted)' }}>
        Страница не найдена
      </p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: 32 }}>
        На главную
      </Link>
    </div>
  )
}
