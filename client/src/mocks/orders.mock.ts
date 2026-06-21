import { delay } from './delay';
import { MockDatabase } from './store';
import type { OrderDetail, OrderListItem, OrderStatus, PaymentStatus } from '../types/order';
import type { ApiResponse, ApiPaginatedResponse } from '../types/common';
import { RAZORPAY_KEY_ID } from '../lib/constants';

const uuid = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
const generateOrderNumber = () => 'MUV-' + Math.floor(100000 + Math.random() * 900000);

export const ordersMockService = {
  async createOrder(addressId: string, couponCode: string | null, carrierNote?: string | null): Promise<ApiResponse<{
    orderId: string;
    orderNumber: string;
    razorpayOrderId: string;
    razorpayKeyId: string;
    amount: number;
    currency: string;
    subtotal: number;
    discountAmount: number;
    shippingAmount: number;
    taxAmount: number;
    totalAmount: number;
  }>> {
    await delay();

    if (MockDatabase.getErrorToggles().simulateServerErrors) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Simulated server error.' },
      };
    }

    const activeUser = MockDatabase.getActiveUser();
    if (!activeUser) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Auth required.' },
      };
    }

    const cart = MockDatabase.getCart();
    if (cart.items.length === 0) {
      return {
        success: false,
        error: { code: 'EMPTY_CART', message: 'Your cart is empty.' },
      };
    }

    const addresses = MockDatabase.getAddresses();
    const address = addresses.find((a) => a.id === addressId);
    if (!address) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid delivery address.' },
      };
    }

    // Verify stock
    const products = MockDatabase.getProducts();
    const outOfStockItems = [];

    for (const item of cart.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod || !prod.isActive || prod.stock < item.quantity) {
        outOfStockItems.push({
          productId: item.productId,
          productName: item.productName,
          availableStock: prod ? prod.stock : 0,
          requestedQuantity: item.quantity,
        });
      }
    }

    if (outOfStockItems.length > 0 || MockDatabase.getErrorToggles().simulateOutofStock) {
      return {
        success: false,
        error: {
          code: 'OUT_OF_STOCK',
          message: 'Some items in your cart are no longer available in the requested quantity.',
          details: outOfStockItems.length > 0 ? outOfStockItems : [
            { productId: cart.items[0].productId, productName: cart.items[0].productName, availableStock: 0, requestedQuantity: cart.items[0].quantity }
          ],
        },
      };
    }

    // Compute Coupon Discount
    let discountAmount = 0;
    if (couponCode) {
      const coupons = MockDatabase.getCoupons();
      const coupon = coupons.find((c) => c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.isActive);
      if (coupon) {
        if (cart.subtotal >= coupon.minOrderAmount) {
          if (coupon.discountType === 'percentage') {
            discountAmount = Math.round((coupon.discountValue / 100) * cart.subtotal);
            if (coupon.maxDiscountAmount > 0 && discountAmount > coupon.maxDiscountAmount) {
              discountAmount = coupon.maxDiscountAmount;
            }
          } else {
            discountAmount = coupon.discountValue;
          }
        }
      }
    }

    const subtotal = cart.subtotal;
    const shippingAmount = 0; // free shipping
    const taxAmount = 0; // standard optional tax
    const totalAmount = subtotal - discountAmount + shippingAmount + taxAmount;
    const orderId = 'ord-' + uuid();
    const orderNumber = generateOrderNumber();
    const razorpayOrderId = 'order_rzp_' + uuid().substring(0, 12);

    const pendingOrder: OrderDetail = {
      id: orderId,
      orderNumber,
      status: 'pending',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      subtotal,
      discountAmount,
      shippingAmount,
      taxAmount,
      totalAmount,
      couponCode,
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country,
      },
      carrierName: null,
      trackingId: null,
      items: cart.items.map((item) => ({
        id: 'orditem-' + uuid(),
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalPrice: item.lineTotal,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customer: {
        id: activeUser.id,
        fullName: activeUser.fullName,
        phone: activeUser.phone,
        email: activeUser.email || 'customer@muvira.com',
      },
      adminNotes: carrierNote ? [
        { id: 'note-' + uuid(), note: `Customer note: ${carrierNote}`, createdAt: new Date().toISOString(), createdBy: 'Customer' }
      ] : [],
    };

    const orders = MockDatabase.getOrders();
    MockDatabase.setOrders([pendingOrder, ...orders]);

    return {
      success: true,
      data: {
        orderId,
        orderNumber,
        razorpayOrderId,
        razorpayKeyId: RAZORPAY_KEY_ID,
        amount: totalAmount,
        currency: 'INR',
        subtotal,
        discountAmount,
        shippingAmount,
        taxAmount,
        totalAmount,
      },
    };
  },

  async verifyPayment(_razorpayOrderId: string, _razorpayPaymentId: string, _razorpaySignature: string): Promise<ApiResponse<{
    verified: boolean;
    orderId: string;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
  }>> {
    await delay();

    if (MockDatabase.getErrorToggles().simulatePaymentError) {
      return {
        success: false,
        error: {
          code: 'PAYMENT_VERIFICATION_FAILED',
          message: "We couldn't verify this payment. Simulated payment signature verification failure.",
        },
      };
    }

    const orders = MockDatabase.getOrders();
    // In our mock, we stored the pending order before payment. Find the last pending order or search in database
    // Wait, the Razorpay order ID is returned by Razorpay Checkout. 
    // In our mock, we just link it to the first 'pending' order or we can store the razorpayOrderId in the order record.
    // Let's find the last order with status 'pending'
    const pendingOrderIdx = orders.findIndex((o) => o.status === 'pending' && o.paymentStatus === 'pending');

    if (pendingOrderIdx === -1) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'No pending order found to verify.' },
      };
    }

    const order = orders[pendingOrderIdx];
    
    // Confirmed payment!
    order.status = 'confirmed';
    order.paymentStatus = 'paid';
    order.updatedAt = new Date().toISOString();

    // Deduct stock from products
    const products = MockDatabase.getProducts();
    for (const item of order.items) {
      const prodIdx = products.findIndex((p) => p.id === item.productId);
      if (prodIdx !== -1) {
        const prod = products[prodIdx];
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.inStock = prod.stock > 0;
      }
    }
    MockDatabase.setProducts(products);

    // Save updated orders
    orders[pendingOrderIdx] = order;
    MockDatabase.setOrders([...orders]);

    // Clear cart!
    MockDatabase.setCart({ items: [], subtotal: 0, itemCount: 0 });

    return {
      success: true,
      data: {
        verified: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: 'confirmed',
        paymentStatus: 'paid',
      },
    };
  },

  async getOrders(page = 1, limit = 20): Promise<ApiPaginatedResponse<OrderListItem>> {
    await delay(200);

    if (MockDatabase.getErrorToggles().simulateServerErrors) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Simulated server error.' },
      };
    }

    const activeUser = MockDatabase.getActiveUser();
    if (!activeUser) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Auth required.' },
      };
    }

    // Filter by customer id (except if admin, but here customer history page is customer-only)
    const allOrders = MockDatabase.getOrders();
    const userOrders = allOrders.filter((o) => o.customer?.id === activeUser.id);

    const total = userOrders.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    
    const paginatedOrders = userOrders.slice(offset, offset + limit).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      fulfillmentStatus: o.fulfillmentStatus,
      totalAmount: o.totalAmount,
      itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
      createdAt: o.createdAt,
    }));

    return {
      success: true,
      data: paginatedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  async getOrderById(id: string): Promise<ApiResponse<OrderDetail>> {
    await delay(150);

    if (MockDatabase.getErrorToggles().simulateServerErrors) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Simulated server error.' },
      };
    }

    const activeUser = MockDatabase.getActiveUser();
    if (!activeUser) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Auth required.' },
      };
    }

    const orders = MockDatabase.getOrders();
    const order = orders.find((o) => o.id === id);

    // Return 404 if not found or if the user doesn't own it (and is not admin)
    if (!order || (order.customer?.id !== activeUser.id && activeUser.role !== 'admin')) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found.' },
      };
    }

    return {
      success: true,
      data: order,
    };
  },
};
