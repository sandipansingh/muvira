import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { STORE_NAME } from '../../lib/constants';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import SearchBar from '../shared/SearchBar';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import { categoriesApiService } from '../../lib/api/categories';
import {
  ShoppingCart,
  User,
  Menu,
  Phone,
  Truck,

  ChevronDown,
  LayoutDashboard,
  LogOut,
  History,
  Info
} from 'lucide-react';

const CATEGORIES_CACHE_KEY = 'navbar_categories_cache';

const DEFAULT_CATEGORIES = [
  { name: 'Solid Wood Furniture', slug: 'solid-wood-furniture' },
  { name: 'Kurtas & Apparel', slug: 'kurtas-apparel' },
  { name: 'Home Decor', slug: 'home-decor' },
  { name: 'Doll', slug: 'doll' },
];

function readCategoriesCache(): { name: string; slug: string }[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_CACHE_KEY);
    if (!raw) return DEFAULT_CATEGORIES;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

function writeCategoriesCache(data: { name: string; slug: string }[]): void {
  try {
    localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(data));
  } catch {
    // fail silently
  }
}

export const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const announcementBar = settings?.announcementBar;
  const contactInfo = settings?.contactInfo;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const [categoriesList, setCategoriesList] = useState<{ name: string; slug: string }[]>(readCategoriesCache);

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

  useEffect(() => {
    let active = true;
    const fetchNavbarCategories = async () => {
      try {
        const res = await categoriesApiService.getCategories();
        if (active && res.success && res.data) {
          console.log('[Navbar] Fetched categories from API:', res.data);
          const navbarCats = res.data
            .filter((cat) => {
              console.log(`[Navbar] Checking category: ${cat.name}, showInNavbar: ${cat.showInNavbar}, isActive: ${cat.isActive}`);
              return cat.showInNavbar && cat.isActive !== false;
            })
            .map((cat) => ({ name: cat.name, slug: cat.slug }));
          console.log('[Navbar] Setting navbar categories list to:', navbarCats);
          setCategoriesList(navbarCats);
          writeCategoriesCache(navbarCats);
        } else if (active && !res.success) {
          console.error('[Navbar] API returned error:', res.error);
        }
      } catch (err) {
        console.error('Failed to fetch navbar categories:', err);
      }
    };
    fetchNavbarCategories();
    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="relative z-[39] bg-[var(--surface)] border-b border-[var(--border)]">
      {/* 1. TOP UTILITY BAR (Desktop only) */}
      {announcementBar?.enabled && (
      <div className="hidden md:block bg-[var(--surface)] text-[var(--text-muted)] text-[11px] font-normal border-b border-[var(--border)] py-2">
        <div className="max-w-[1240px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {announcementBar.badge && (
              <span className="text-[var(--accent)] font-medium tracking-wider">{announcementBar.badge}:</span>
            )}
            <span>{announcementBar.message}</span>
          </div>
          <div className="flex items-center gap-6">
            {contactInfo && (
              <a href={`tel:${contactInfo.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>Call Us: {contactInfo.phone}</span>
              </a>
            )}
            <Link to="/orders" className="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors">
              <Truck className="w-3.5 h-3.5 shrink-0" />
              <span>Track Order</span>
            </Link>
          </div>
        </div>
      </div>
      )}

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
          <span className="text-[21px] md:text-[24px] font-semibold tracking-[-0.2px] text-[var(--text)] uppercase font-redhatMedium">
            {STORE_NAME}
            <span className="text-[var(--accent)] font-medium">.</span>
          </span>
        </Link>

        {/* Centered Search Bar (Desktop only) */}
        <div className="hidden md:block flex-1 max-w-[500px]">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Action Navigation Icons */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* Wishlist intentionally not linked until implemented */}

          {/* User Account / Profile */}
          <div className="relative">
            {isAuthenticated ? (
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex flex-col items-center justify-center min-w-[40px] text-secondary700 hover:text-primaryBg transition-colors focus:outline-none"
                >
                  <User className="w-[23.6px] h-[23.5px]" />
                  <span className="text-[12px] tracking-wide mt-1 flex items-center gap-0.5">
                    {(() => {
                      const firstName = user?.fullName ? user.fullName.trim().split(/\s+/)[0] : '';
                      const greetingName = firstName.length > 7 ? `${firstName.slice(0, 6)}...` : firstName;
                      return `Hi, ${greetingName}`;
                    })()}
                    <ChevronDown className="w-3 h-3 shrink-0" />
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
      <div className="hidden md:block bg-[var(--surface-2)] border-t border-[var(--border)] font-medium">
        <div className="max-w-[1240px] mx-auto px-6">
          <nav className="flex items-center gap-7 py-2.5 text-[13px]">
            <Link to="/" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
              Home
            </Link>
            <Link to="/products" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
              All Products
            </Link>
            {categoriesList.map((cat) => (
              <Link
                key={cat.slug}
                to={`/categories/${cat.slug}`}
                className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
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
        <div className="flex flex-col gap-6 text-left">
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
            {contactInfo && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primaryBg" />
                <span>Call support: {contactInfo.phone}</span>
              </div>
            )}
            {announcementBar?.enabled && announcementBar.message && (
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primaryBg" />
              <span>{announcementBar.message}</span>
            </div>
            )}
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
