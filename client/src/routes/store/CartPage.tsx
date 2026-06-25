import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../hooks/useCart'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { formatPrice } from '../../lib/format'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Card, { CardContent } from '../../components/ui/Card'
import Breadcrumb from '../../components/layout/Breadcrumb'
import EmptyState from '../../components/shared/EmptyState'
import { Trash2, ShoppingBag, Minus, Plus, Tag, X } from 'lucide-react'

export const CartPage: React.FC = () => {
  const {
    cart,
    coupon,
    loading,
    updateQuantity,
    removeFromCart,
    applyCouponCode,
    removeCouponCode,
    shippingAmount,
    totalAmount,
  } = useCart()

  const { settings } = useSiteSettings()
  const shippingRules = settings?.shippingRules
  const discountAmount = coupon ? coupon.discountAmount : 0
  const discountedSubtotal = cart.subtotal - discountAmount

  const navigate = useNavigate()
  const [couponInput, setCouponInput] = useState('')
  const [applying, setApplying] = useState(false)

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!couponInput.trim()) return

    setApplying(true)
    const success = await applyCouponCode(couponInput.trim())
    setApplying(false)

    if (success) {
      setCouponInput('')
    }
  }

  const handleRemoveCoupon = async () => {
    await removeCouponCode()
  }

  if (cart.items.length === 0) {
    return (
      <div className="max-w-[1240px] mx-auto px-6 py-12">
        <EmptyState
          title="Your Cart is Empty"
          description="Looks like you haven't added any handcrafted designs to your shopping cart yet."
          actionLabel="Continue Shopping"
          onAction={() => navigate('/products')}
          icon={<ShoppingBag className="w-12 h-12" />}
        />
      </div>
    )
  }

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6 text-left">
      <Breadcrumb items={[{ label: 'Shopping Cart' }]} />

      <h1 className="text-xl md:text-2xl font-bold tracking-wide text-darkColor my-6">
        Shopping Cart
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ITEMS LIST */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <Card key={item.id} className="border border-secondary200">
              <CardContent className="p-4 flex gap-4">
                {/* Image */}
                <div className="w-20 h-20 md:w-24 md:h-24 bg-lightgrayColor rounded-lg overflow-hidden border border-secondary200 shrink-0">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-grow flex flex-col justify-between text-left">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <Link
                        to={`/products/${item.productSlug}`}
                        className="text-xs md:text-sm font-semibold text-darkColor hover:text-primaryBg transition-colors line-clamp-2 pr-2"
                      >
                        {item.productName}
                      </Link>
                      <span className="text-[10px] text-secondary500 uppercase tracking-widest font-semibold block mt-1">
                        Unit Price: {formatPrice(item.unitPrice)}
                      </span>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-secondary500 hover:text-rose-600 transition-colors p-1"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4.5 h-4.5 shrink-0" />
                    </button>
                  </div>

                  {/* Quantity and Line Total */}
                  <div className="flex items-center justify-between gap-4 mt-3">
                    {/* Quantity selectors */}
                    <div className="flex items-center border border-secondary300 rounded-full bg-white p-0.5">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || loading}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-secondary600 hover:bg-lightgrayColor disabled:opacity-40 focus:outline-none"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-semibold text-darkColor">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.availableStock || loading}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-secondary600 hover:bg-lightgrayColor disabled:opacity-40 focus:outline-none"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Total Price */}
                    <div className="text-right">
                      <span className="text-xs text-secondary500 uppercase tracking-widest font-medium block">
                        Line Total
                      </span>
                      <span className="text-sm font-semibold text-darkColor">
                        {formatPrice(item.lineTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ORDER SUMMARY */}
        <div className="space-y-4">
          <Card className="border border-secondary200 shadow-sm">
            <CardContent className="p-5 space-y-5">
              <h3 className="text-sm font-bold text-darkColor uppercase tracking-widest border-b border-secondary200 pb-3">
                Order Summary
              </h3>

              {/* Bill Details */}
              <div className="space-y-2.5 text-xs md:text-sm tracking-wide border-b border-secondary200 pb-4">
                <div className="flex justify-between text-secondary600">
                  <span>Cart Subtotal ({cart.itemCount} items)</span>
                  <span className="font-semibold text-darkColor">{formatPrice(cart.subtotal)}</span>
                </div>
                {coupon && (
                  <div className="flex justify-between text-emerald-700 font-medium items-center">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span>Coupon Discount ({coupon.code})</span>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-secondary400 hover:text-rose-600 p-0.5 rounded-full hover:bg-rose-50 transition-colors inline-flex items-center justify-center"
                        title="Remove Coupon"
                        aria-label="Remove Coupon"
                      >
                        <X className="w-3 h-3 shrink-0" />
                      </button>
                    </span>
                    <span>-{formatPrice(coupon.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-secondary600">
                  <span>Delivery Shipping</span>
                  {shippingAmount === 0 ? (
                    <span className="text-emerald-700 font-semibold uppercase tracking-wider">
                      Free
                    </span>
                  ) : (
                    <span className="font-semibold text-darkColor">
                      {formatPrice(shippingAmount)}
                    </span>
                  )}
                </div>
                {shippingRules &&
                  shippingRules.freeShippingThresholdPaisa > 0 &&
                  shippingAmount > 0 && (
                    <div className="text-[10px] text-[#c65c30] bg-[#c65c30]/5 px-2.5 py-1.5 rounded-lg border border-[#c65c30]/10 flex items-center mt-1">
                      <span>
                        Add{' '}
                        <strong>
                          {formatPrice(
                            shippingRules.freeShippingThresholdPaisa - discountedSubtotal
                          )}
                        </strong>{' '}
                        more for Free Shipping!
                      </span>
                    </div>
                  )}
              </div>

              {/* Total Row */}
              <div className="flex justify-between items-center text-darkColor font-bold py-1">
                <span className="text-sm md:text-base uppercase tracking-wider">
                  Estimated Total
                </span>
                <span className="text-base md:text-lg text-primaryBg">
                  {formatPrice(totalAmount)}
                </span>
              </div>

              {/* Coupon inputs */}
              {!coupon && (
                <div className="border-t border-secondary200 pt-4 text-left">
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <Input
                      placeholder="ENTER COUPON CODE"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="uppercase text-xs !py-2"
                      disabled={applying}
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      loading={applying}
                      className="text-xs px-4"
                    >
                      Apply
                    </Button>
                  </form>
                </div>
              )}

              {/* Checkout CTA */}
              <Button
                variant="primary"
                onClick={() => navigate('/checkout')}
                className="w-full text-sm py-3"
              >
                Proceed to Checkout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default CartPage
