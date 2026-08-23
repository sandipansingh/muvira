import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
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
import { ScrollToTop } from './components/common/ScrollToTop'

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
import { ReviewsPage } from './pages/ReviewsPage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'

const MainLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-foreground selection:bg-primary-soft selection:text-foreground">
      <AnnouncementBar />
      <Header onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <CartDrawer />

      <div className="flex-1">
        <Outlet />
      </div>

      <Footer />
    </div>
  )
}

export const AppContent: React.FC = () => {
  return (
    <div className="font-sans text-foreground selection:bg-primary-soft selection:text-foreground">
      <ScrollToTop />
      <ToastContainer />

      <Routes>
        {/* Standalone auth routes without navbar or footer */}
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/login" element={<Navigate to="/signin" replace />} />

        {/* Store routes wrapped in standard app shell */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrdersHistoryPage />} />
          <Route path="/orders/success" element={<OrderSuccessPage />} />
          <Route path="/orders/failure" element={<OrderFailurePage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SiteSettingsProvider>
            <CartProvider>
              <AppContent />
            </CartProvider>
          </SiteSettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
