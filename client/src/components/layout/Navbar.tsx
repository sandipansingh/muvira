import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { STORE_NAME } from '../../lib/constants';
import SearchBar from '../shared/SearchBar';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import {
  ShoppingCart,
  User,
  Menu,
  Phone,
  Truck,
  Heart,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  History,
  Info
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    setProfileDropdownOpen(false);
    navigate('/');
  };

  const categoriesList = [
    { name: 'Kurtas & Apparel', slug: 'kurtas-apparel' },
    { name: 'Home Decor', slug: 'home-decor' },
    { name: 'Solid Wood Furniture', slug: 'solid-wood-furniture' },
    { name: 'Bed & Bath', slug: 'bed-bath' },
  ];

  return (
    <header className="relative z-[39] bg-white border-b border-secondary200">
      {/* 1. TOP UTILITY BAR (Desktop only) */}
      <div className="hidden md:block bg-darkColor text-[#D1D1D1] text-[11px] font-roboto font-normal border-b border-secondary600/20 py-2">
        <div className="max-w-[1240px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-primaryBg font-medium">NEW DEALS:</span>
            <span>Diwali Festival Sale is active! Save 20% off with coupon <b>DIWALI20</b></span>
          </div>
          <div className="flex items-center gap-6">
            <a href="tel:+919876543210" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone className="w-3.5 h-3.5" />
              <span>Call Us: +91 98765 43210</span>
            </a>
            <Link to="/orders" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Truck className="w-3.5 h-3.5" />
              <span>Track Order</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER */}
      <div className="max-w-[1240px] mx-auto px-6 py-4 flex items-center justify-between gap-4 md:py-6">
        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden text-secondary700 hover:text-primaryBg p-1 focus:outline-none"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Store Logo */}
        <Link to="/" className="flex items-center">
          <span className="text-xl md:text-2xl font-bold tracking-wider text-darkColor uppercase">
            {STORE_NAME}
            <span className="text-primaryBg font-extrabold font-pangrambold">.</span>
          </span>
        </Link>

        {/* Centered Search Bar (Desktop only) */}
        <div className="hidden md:block flex-1 max-w-[500px]">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Action Navigation Icons */}
        <div className="flex items-center gap-4 md:gap-6 font-redhat">
          {/* Wishlist Link (Mocked) */}
          <Link to="#" className="hidden md:inline-flex flex-col items-center justify-center min-w-[40px] text-secondary700 hover:text-primaryBg transition-colors">
            <Heart className="w-[22px] h-[20.5px]" />
            <span className="text-[12px] tracking-wide mt-1">Wishlist</span>
          </Link>

          {/* User Account / Profile */}
          <div className="relative">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex flex-col items-center justify-center min-w-[40px] text-secondary700 hover:text-primaryBg transition-colors focus:outline-none"
                >
                  <User className="w-[23.6px] h-[23.5px]" />
                  <span className="text-[12px] tracking-wide mt-1 flex items-center gap-0.5">
                    Account <ChevronDown className="w-3 h-3 shrink-0" />
                  </span>
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-52 bg-white rounded-xl shadow-2xl border border-secondary200 py-2.5 z-50 text-left transition-smooth animate-slide-in">
                    <div className="px-4 py-2 border-b border-secondary200">
                      <p className="text-xs text-secondary500 font-medium">Signed in as</p>
                      <p className="text-sm font-semibold text-darkColor truncate">{user?.fullName}</p>
                    </div>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs md:text-sm text-secondary700 hover:bg-lightgrayColor hover:text-primaryBg transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 shrink-0" />
                        Admin Dashboard
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs md:text-sm text-secondary700 hover:bg-lightgrayColor hover:text-primaryBg transition-colors"
                    >
                      <User className="w-4 h-4 shrink-0" />
                      My Profile
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs md:text-sm text-secondary700 hover:bg-lightgrayColor hover:text-primaryBg transition-colors"
                    >
                      <History className="w-4 h-4 shrink-0" />
                      Order History
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs md:text-sm text-rose-600 hover:bg-rose-50 transition-colors border-t border-secondary200 mt-1.5 text-left focus:outline-none"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex flex-col items-center justify-center min-w-[40px] text-secondary700 hover:text-primaryBg transition-colors"
              >
                <User className="w-[23.6px] h-[23.5px]" />
                <span className="text-[12px] tracking-wide mt-1">Sign In</span>
              </Link>
            )}
          </div>

          {/* Cart Icon with badge count */}
          <Link
            to="/cart"
            className="flex flex-col items-center justify-center min-w-[40px] text-secondary700 hover:text-primaryBg transition-colors relative"
          >
            <div className="relative">
              <ShoppingCart className="w-[22px] h-[20.2px]" />
              {cart.itemCount > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-primaryBg text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white">
                  {cart.itemCount}
                </span>
              )}
            </div>
            <span className="text-[12px] tracking-wide mt-1">Cart</span>
          </Link>
        </div>
      </div>

      {/* 3. MOBILE SEARCH BAR (Mobile only, hidden md:block) */}
      <div className="px-6 pb-4 md:hidden">
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* 4. MEGA NAVIGATION MENU STRIP (Desktop only) */}
      <div className="hidden md:block bg-lightgrayColor/50 border-t border-secondary200 font-redhat font-medium">
        <div className="max-w-[1240px] mx-auto px-6">
          <nav className="flex items-center gap-6 py-2.5">
            <Link to="/" className="text-secondary700 hover:text-primaryBg hover:underline transition-all duration-200">
              Home
            </Link>
            <Link to="/products" className="text-secondary700 hover:text-primaryBg hover:underline transition-all duration-200">
              All Products
            </Link>
            {categoriesList.map((cat) => (
              <Link
                key={cat.slug}
                to={`/categories/${cat.slug}`}
                className="text-secondary700 hover:text-primaryBg hover:underline transition-all duration-200"
              >
                {cat.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* 5. MOBILE NAVIGATION DRAWER SHEET */}
      <Sheet
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="Menu Options"
      >
        <div className="flex flex-col gap-6 text-left font-redhat">
          {/* User Section */}
          <div className="bg-lightgrayColor rounded-xl p-4 flex flex-col gap-3">
            {isAuthenticated ? (
              <>
                <div>
                  <p className="text-xs text-secondary500">Welcome,</p>
                  <p className="text-sm font-semibold text-darkColor">{user?.fullName}</p>
                </div>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-xs font-semibold text-primaryBg bg-white border border-primary200 p-2 rounded-lg"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Admin Dashboard
                  </Link>
                )}
              </>
            ) : (
              <div className="flex gap-2.5">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="flex-1"
                >
                  Log In
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/signup');
                  }}
                  className="flex-1 bg-white"
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-secondary500 uppercase tracking-wider pl-1">
              Shop Categories
            </h4>
            <div className="flex flex-col border border-secondary200 rounded-xl overflow-hidden divide-y divide-secondary200 bg-white">
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 text-sm text-secondary700 hover:text-primaryBg active:bg-lightgrayColor block"
              >
                All Products
              </Link>
              {categoriesList.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/categories/${cat.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 text-sm text-secondary700 hover:text-primaryBg active:bg-lightgrayColor block"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-secondary500 uppercase tracking-wider pl-1">
              Customer Links
            </h4>
            <div className="flex flex-col border border-secondary200 rounded-xl overflow-hidden divide-y divide-secondary200 bg-white">
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 text-sm text-secondary700 hover:text-primaryBg active:bg-lightgrayColor block"
              >
                My Account Settings
              </Link>
              <Link
                to="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 text-sm text-secondary700 hover:text-primaryBg active:bg-lightgrayColor block"
              >
                My Order History
              </Link>
            </div>
          </div>

          {/* Contact Strip */}
          <div className="mt-auto pt-6 text-xs text-secondary500 flex flex-col gap-2 pl-1 border-t border-secondary200">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primaryBg" />
              <span>Call support: +91 98765 43210</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primaryBg" />
              <span>Diwali coupon: DIWALI20</span>
            </div>
            {isAuthenticated && (
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                  navigate('/');
                }}
                className="flex items-center gap-2 text-rose-600 font-semibold mt-4 text-left p-1"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      </Sheet>
    </header>
  );
};

export default Navbar;
