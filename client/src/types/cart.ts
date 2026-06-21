export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  unitPrice: number; // in paisa
  quantity: number;
  lineTotal: number; // unitPrice * quantity in paisa
  inStock: boolean;
  availableStock: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number; // in paisa
  itemCount: number;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}
