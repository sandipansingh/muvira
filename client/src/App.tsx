import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { SiteSettingsProvider } from './context/SiteSettingsContext'

import { AnnouncementBar } from './components/layout/AnnouncementBar'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { MobileMenu } from './components/layout/MobileMenu'
import { CartDrawer } from './components/cart/CartDrawer'
import { ToastContainer } from './components/common/Toast'

import { HomePage } from './pages/HomePage'
import { ShopPage } from './pages/ShopPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { OrderSuccessPage } from './pages/OrderSuccessPage'
import { OrderFailurePage } from './pages/OrderFailurePage'
import { OrdersHistoryPage } from './pages/OrdersHistoryPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { ProfilePage } from './pages/ProfilePage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'

export const AppContent: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex flex-col min-h-screen font-sans bg-white text-zinc-900 selection:bg-[#C88D35]/20 selection:text-[#C88D35]">
      <AnnouncementBar />
      <Header onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <CartDrawer />
      <ToastContainer />

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrdersHistoryPage />} />
          <Route path="/orders/success" element={<OrderSuccessPage />} />
          <Route path="/orders/failure" element={<OrderFailurePage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      </div>

      <Footer />
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <SiteSettingsProvider>
              <AppContent />
            </SiteSettingsProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
