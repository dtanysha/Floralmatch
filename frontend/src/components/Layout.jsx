import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import CartPanel from './CartPanel'
import ScrollToTop from './ScrollToTop'

export default function Layout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <ScrollToTop />
      <Header />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
      <CartPanel />
    </div>
  )
}
