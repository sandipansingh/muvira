import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Clock } from 'lucide-react'
import { formatPrice } from '../lib/utils/format'

export const OrdersHistoryPage: React.FC = () => {
  const orders = [
    {
      id: 'ORD-849201',
      date: '2026-08-05',
      status: 'CONFIRMED',
      totalPaisa: 214000,
      itemCount: 1,
      firstItemName: 'Hollis 3-Seater Sofa',
      image:
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'ORD-721092',
      date: '2026-07-12',
      status: 'DELIVERED',
      totalPaisa: 89000,
      itemCount: 1,
      firstItemName: 'Marlow Lounge Chair',
      image:
        'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=300&q=80',
    },
  ]

  return (
    <main className="bg-white min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-zinc-900">Order History</h1>
          <p className="text-xs text-zinc-500 mt-1">Track your past purchases and deliveries</p>
        </div>

        <div className="space-y-4">
          {orders.map((ord) => (
            <Link
              key={ord.id}
              to={`/orders/${ord.id}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-[#F6F4EF] rounded-2xl border border-zinc-200 hover:border-[#C88D35] transition-all gap-4 block"
            >
              <div className="flex items-center gap-4">
                <img
                  src={ord.image}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover bg-white border border-zinc-200"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-base text-zinc-900">#{ord.id}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ord.status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 font-medium mt-0.5">{ord.firstItemName}</p>
                  <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Placed on {ord.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-200">
                <div className="text-right">
                  <span className="font-sans font-bold text-base text-zinc-900 block">
                    {formatPrice(ord.totalPaisa)}
                  </span>
                  <span className="text-[11px] text-zinc-500">{ord.itemCount} item(s)</span>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
