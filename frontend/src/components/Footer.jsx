import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__col">
          <h4 className="footer__title">FloralMatch</h4>
          <p className="footer__text">Цветочный магазин с конструктором букетов</p>
        </div>

        <div className="footer__col">
          <h4 className="footer__title">Контакты</h4>
          <p className="footer__text">+7 (999) 123-45-67</p>
          <p className="footer__text">hello@floralmatch.ru</p>
        </div>

        <div className="footer__col">
          <h4 className="footer__title">Время работы</h4>
          <p className="footer__text">Ежедневно 9:00 — 21:00</p>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="container">
          <p className="footer__copy">© {new Date().getFullYear()} FloralMatch</p>
        </div>
      </div>
    </footer>
  )
}
