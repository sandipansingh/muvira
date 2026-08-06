import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Package, MapPin, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth()
  const { showToast } = useToast()

  const [fullName, setFullName] = useState(user?.fullName || 'Priya Nair')
  const [phone, setPhone] = useState(user?.phone || '9876543210')

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    showToast('Profile updated successfully!', 'success')
  }

  return (
    <main className="bg-white min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C88D35]">
              Account Overview
            </span>
            <h1 className="font-serif text-3xl font-bold text-zinc-900 mt-0.5">My Profile</h1>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-50 text-red-700 text-xs font-semibold rounded-xl hover:bg-red-100 flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Quick Nav Links */}
          <div className="space-y-2">
            <Link
              to="/profile"
              className="flex items-center gap-3 p-3 bg-[#F6F4EF] rounded-xl font-bold text-xs text-zinc-900 border border-zinc-200"
            >
              <User className="w-4 h-4 text-[#C88D35]" /> Personal Info
            </Link>
            <Link
              to="/orders"
              className="flex items-center gap-3 p-3 bg-white hover:bg-[#F6F4EF] rounded-xl font-medium text-xs text-zinc-700 border border-zinc-200/80 transition-colors"
            >
              <Package className="w-4 h-4 text-zinc-500" /> My Orders
            </Link>
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl font-medium text-xs text-zinc-700 border border-zinc-200/80">
              <MapPin className="w-4 h-4 text-zinc-500" /> Saved Addresses (2)
            </div>
          </div>

          {/* Right Personal Info Form */}
          <div className="md:col-span-2 bg-[#F6F4EF] p-6 sm:p-8 rounded-3xl border border-zinc-200/80 space-y-6">
            <h3 className="font-serif text-xl font-bold text-zinc-900">Personal Details</h3>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Email</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || 'priya.nair@email.com'}
                  className="w-full bg-zinc-200/60 border border-zinc-300 rounded-xl px-4 py-3 text-base text-zinc-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-base text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C88D35]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-base text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C88D35]"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-zinc-900 text-white font-semibold text-xs rounded-xl hover:bg-[#C88D35] transition-colors"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
