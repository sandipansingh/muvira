import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { STORE_NAME } from '../../lib/constants';
import {
  LayoutDashboard,
  Box,
  FolderTree,
  ShoppingBag,
  Ticket,
  Percent,
  Warehouse,
  Settings
} from 'lucide-react';

export const AdminSidebar: React.FC = () => {
  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
    { name: 'Products', path: '/admin/products', icon: Box },
    { name: 'Categories', path: '/admin/categories', icon: FolderTree },
    { name: 'Orders', path: '/admin/orders', icon: ShoppingBag },
    { name: 'Coupons', path: '/admin/coupons', icon: Ticket },
    { name: 'Campaigns', path: '/admin/campaigns', icon: Percent },
    { name: 'Inventory', path: '/admin/inventory', icon: Warehouse },
    { name: 'Site Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-darkColor text-secondary300 h-screen fixed top-0 left-0 flex flex-col border-r border-secondary600/20 z-40 text-left font-instrument">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-secondary600/20 flex items-center justify-between">
        <Link to="/admin" className="flex items-center">
          <span className="text-lg font-medium text-white tracking-widest uppercase">
            {STORE_NAME} <span className="text-xs text-secondary400 font-medium lowercase">admin</span>
          </span>
        </Link>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto no-scrollbar">
        <p className="text-[10px] font-medium text-secondary500 uppercase tracking-widest pl-3 mb-2">
          Management
        </p>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs md:text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-secondary400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <span>{item.name}</span>
            </div>
          </NavLink>
        ))}
      </nav>

      {/* Footer Links */}
      <div className="p-4 border-t border-secondary600/20">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs md:text-sm text-secondary400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <span>Go to Live Store</span>
        </Link>
      </div>
    </aside>
  );
};

export default AdminSidebar;
