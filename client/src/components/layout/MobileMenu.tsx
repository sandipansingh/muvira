import React from 'react'
import { Link } from 'react-router-dom'
import { X, ChevronRight, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const { isAuthenticated, user, logout } = useAuth()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-2xl z-10 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <span className="font-serif text-2xl font-bold text-zinc-900">Muvira</span>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-900 rounded-full hover:bg-zinc-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Links */}
          <div className="p-6 space-y-4">
            <Link
              to="/shop"
              onClick={onClose}
              className="flex items-center justify-between text-base font-semibold text-zinc-900 hover:text-[#C88D35] py-2 border-b border-zinc-100"
            >
              Shop All Products
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </Link>
            <Link
              to="/shop?category=living-room"
              onClick={onClose}
              className="flex items-center justify-between text-sm font-medium text-zinc-700 hover:text-[#C88D35] py-2"
            >
              Living Room
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </Link>
            <Link
              to="/shop?category=bedroom"
              onClick={onClose}
              className="flex items-center justify-between text-sm font-medium text-zinc-700 hover:text-[#C88D35] py-2"
            >
              Bedroom
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </Link>
            <Link
              to="/shop?category=dining"
              onClick={onClose}
              className="flex items-center justify-between text-sm font-medium text-zinc-700 hover:text-[#C88D35] py-2"
            >
              Dining
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </Link>
            <Link
              to="/shop?category=office-decor"
              onClick={onClose}
              className="flex items-center justify-between text-sm font-medium text-zinc-700 hover:text-[#C88D35] py-2"
            >
              Office & Decor
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </Link>
          </div>
        </div>

        {/* User Footer */}
        <div className="p-6 bg-[#F6F4EF] border-t border-zinc-200">
          {isAuthenticated ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C88D35] text-white flex items-center justify-center font-bold">
                  {user?.fullName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{user?.fullName}</p>
                  <p className="text-xs text-zinc-500">{user?.email}</p>
                </div>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  to="/orders"
                  onClick={onClose}
                  className="w-full text-center py-2 text-xs font-semibold bg-white rounded-lg border border-zinc-200 text-zinc-800"
                >
                  My Orders
                </Link>
                <button
                  onClick={() => {
                    logout()
                    onClose()
                  }}
                  className="w-full text-center py-2 text-xs font-semibold bg-red-50 rounded-lg text-red-700"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Link
                to="/login"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#18181B] text-white text-sm font-medium rounded-xl shadow-xs"
              >
                <User className="w-4 h-4" /> Sign In
              </Link>
              <Link
                to="/signup"
                onClick={onClose}
                className="w-full flex items-center justify-center py-3 bg-white text-zinc-900 text-sm font-medium rounded-xl border border-zinc-200"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
