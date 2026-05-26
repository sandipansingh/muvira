import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';

// Providers
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SiteSettingsProvider } from './context/SiteSettingsContext';

// Guards
import { RequireAuth, RequireAdmin } from './components/auth/AuthGuard';

// Customer Layout Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ScrollToTop from './components/shared/ScrollToTop';

// Admin Layout Components
import AdminSidebar from './components/layout/AdminSidebar';
import AdminTopbar from './components/layout/AdminTopbar';
import Sheet from './components/ui/Sheet';

// Customer Pages
import Home from './routes/store/Home';
import Products from './routes/store/Products';
import ProductDetail from './routes/store/ProductDetail';
import Categories from './routes/store/Categories';
import CategoryDetail from './routes/store/CategoryDetail';
import SearchResults from './routes/store/SearchResults';
import CartPage from './routes/store/CartPage';
import CheckoutPage from './routes/store/CheckoutPage';
import OrderSuccess from './routes/store/OrderSuccess';
import OrderFailure from './routes/store/OrderFailure';
import OrderHistory from './routes/store/OrderHistory';
import OrderDetail from './routes/store/OrderDetail';
import Profile from './routes/store/Profile';
import Login from './routes/store/Login';
import Signup from './routes/store/Signup';
import ForgotPassword from './routes/store/ForgotPassword';

// Admin Pages
import Dashboard from './routes/admin/Dashboard';
import ProductsList from './routes/admin/ProductsList';
import ProductForm from './routes/admin/ProductForm';
import CategoriesList from './routes/admin/CategoriesList';
import OrdersList from './routes/admin/OrdersList';
import AdminOrderDetail from './routes/admin/AdminOrderDetail';
import CouponsList from './routes/admin/CouponsList';
import CampaignsList from './routes/admin/CampaignsList';
import InventoryList from './routes/admin/InventoryList';
import SiteSettings from './routes/admin/SiteSettings';

// CUSTOMER PAGES LAYOUT WRAPPER
const CustomerLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

// ADMIN PAGES LAYOUT WRAPPER
const AdminLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-lightgrayColor flex font-instrument">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 shrink-0">
        <AdminSidebar />
      </div>

      {/* Mobile Drawer Sidebar */}
      <Sheet
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="Admin Navigation"
      >
        <div className="-mx-5 -mt-5">
          <AdminSidebar />
        </div>
      </Sheet>

      {/* Main Container */}
      <div className="flex-grow flex flex-col min-w-0 min-h-screen">
        <AdminTopbar onToggleSidebar={() => setMobileMenuOpen(true)} />
        <main className="flex-grow p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <SiteSettingsProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <Routes>
              {/* Customer Routes */}
              <Route path="/" element={<CustomerLayout />}>
                <Route index element={<Home />} />
                <Route path="products" element={<Products />} />
                <Route path="products/:slug" element={<ProductDetail />} />
                <Route path="categories" element={<Categories />} />
                <Route path="categories/:slug" element={<CategoryDetail />} />
                <Route path="search" element={<SearchResults />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="login" element={<Login />} />
                <Route path="signup" element={<Signup />} />
                <Route path="forgot-password" element={<ForgotPassword />} />

                {/* Protected Customer Routes */}
                <Route path="checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
                <Route path="orders/success" element={<RequireAuth><OrderSuccess /></RequireAuth>} />
                <Route path="orders/failure" element={<RequireAuth><OrderFailure /></RequireAuth>} />
                <Route path="orders" element={<RequireAuth><OrderHistory /></RequireAuth>} />
                <Route path="orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
                <Route path="profile" element={<RequireAuth><Profile /></RequireAuth>} />
              </Route>

              {/* Admin Dashboard Routes */}
              <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<ProductsList />} />
                <Route path="products/new" element={<ProductForm />} />
                <Route path="products/:id/edit" element={<ProductForm />} />
                <Route path="categories" element={<CategoriesList />} />
                <Route path="orders" element={<OrdersList />} />
                <Route path="orders/:id" element={<AdminOrderDetail />} />
                <Route path="coupons" element={<CouponsList />} />
                <Route path="campaigns" element={<CampaignsList />} />
                <Route path="inventory" element={<InventoryList />} />
                <Route path="settings" element={<SiteSettings />} />
              </Route>
            </Routes>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
      </SiteSettingsProvider>
    </BrowserRouter>
  );
};

export default App;
