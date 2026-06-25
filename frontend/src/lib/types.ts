// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── Product ─────────────────────────────────────────────────────────────────

export interface ProductImage {
  key: string;
  url: string;
  isThumbnail: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;       // VND (bigint)
  stockQty: number;
  images: ProductImage[];
  category?: Category;
  isActive: boolean;
}

export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  productName: string;
  productSlug: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
}

// ─── Order ───────────────────────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'vnpay' | 'momo' | 'cod';

export interface ShippingAddress {
  street: string;
  ward: string;
  district: string;
  city: string;
  zipCode?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productSlug?: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  data: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export interface PaymentInitResponse {
  transactionId: string;
  paymentRef: string;
  qrCode: string;      // base64 PNG data URL
  paymentUrl: string;  // fake VNPay URL
  amount: number;
  status: string;
}

// ─── API generic ─────────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  message: string;
}
