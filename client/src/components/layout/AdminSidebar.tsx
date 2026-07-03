import React from 'react'
import { NavLink, Link } from 'react-router-dom'
import { STORE_NAME } from '../../lib/constants'
import {
  LayoutDashboard,
  Box,
  FolderTree,
  ShoppingBag,
  Ticket,
  Warehouse,
  Settings,
  ArrowUpRight,
  Star,
  X,
} from 'lucide-react'

interface AdminSidebarProps {
  onClose?: () => void
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ onClose }) => {
  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
    { name: 'Products', path: '/admin/products', icon: Box },
    { name: 'Categories', path: '/admin/categories', icon: FolderTree },
    { name: 'Orders', path: '/admin/orders', icon: ShoppingBag },
    { name: 'Reviews', path: '/admin/reviews', icon: Star },
    { name: 'Coupons', path: '/admin/coupons', icon: Ticket },
    { name: 'Inventory', path: '/admin/inventory', icon: Warehouse },
    { name: 'Site Settings', path: '/admin/settings', icon: Settings },
  ]

  return (
    <aside className="w-full h-full flex flex-col bg-white text-secondary700 border-r border-secondary200 text-left">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-secondary200 flex items-center justify-between shrink-0">
        <Link to="/admin" className="flex items-center" onClick={onClose}>
          <span className="text-lg font-medium text-darkColor tracking-widest uppercase font-redhatMedium">
            {STORE_NAME} <span className="text-xs text-primaryBg font-medium lowercase">admin</span>
          </span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="text-secondary500 hover:text-darkColor p-1 rounded-full hover:bg-lightgrayColor focus:outline-none transition-colors lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto no-scrollbar">
        <p className="text-[10px] font-semibold text-secondary500 uppercase tracking-widest pl-3 mb-2">
          Management
        </p>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs md:text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-darkColor text-white font-semibold shadow-sm'
                  : 'text-secondary500 hover:bg-lightgrayColor hover:text-darkColor'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-4.5 h-4.5 shrink-0 opacity-85 group-hover:opacity-100 transition-opacity" />
              <span>{item.name}</span>
            </div>
          </NavLink>
        ))}
      </nav>

      {/* Footer Links */}
      <div className="p-4 border-t border-secondary200 shrink-0">
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs md:text-sm text-secondary500 hover:bg-lightgrayColor hover:text-darkColor transition-colors"
        >
          <span>Go to Live Store</span>
          <ArrowUpRight className="w-4 h-4 text-secondary500" />
        </Link>
      </div>
    </aside>
  )
}

export default AdminSidebar
