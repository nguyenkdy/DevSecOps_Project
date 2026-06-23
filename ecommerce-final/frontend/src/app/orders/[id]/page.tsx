'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { ordersApi } from '@/lib/api';
import { formatVND, formatDate, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, getOrderStatusColor, getPaymentStatusColor } from '@/lib/utils';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import type { Order } from '@/lib/types';

export default function OrderDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const showSuccess = searchParams.get('success') === '1';

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    ordersApi.getById(params.id as string)
      .then((data) => setOrder(data as Order))
      .catch(() => setError('Không tìm thấy đơn hàng'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, params.id]);

  if (authLoading || loading) return <PageLoading />;
  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Alert type="error" message={error || 'Đơn hàng không tồn tại'} />
        <Link href="/orders" className="btn-primary mt-4 inline-block">
          Xem danh sách đơn hàng
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {showSuccess && (
        <Alert type="success" message="Đặt hàng thành công! Chúng tôi sẽ liên hệ xác nhận sớm nhất." />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 mt-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Đơn hàng #{order.id.substring(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{formatDate(order.createdAt)}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getOrderStatusColor(order.status)}`}>
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
            {PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Items */}
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Sản phẩm đã đặt</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-gray-100 shrink-0 overflow-hidden relative">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-xl">📦</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                  <p className="text-xs text-gray-500">
                    {formatVND(Number(item.unitPrice))} × {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-bold shrink-0">
                  {formatVND(Number(item.unitPrice) * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between items-center">
            <span className="font-medium text-gray-900">Tổng cộng</span>
            <span className="text-lg font-bold text-blue-600">
              {formatVND(Number(order.totalAmount))}
            </span>
          </div>
        </div>

        {/* Shipping address */}
        {order.shippingAddress && (
          <div className="card p-4">
            <h2 className="font-semibold text-gray-900 mb-2">Địa chỉ giao hàng</h2>
            <p className="text-sm text-gray-600">
              {order.shippingAddress.street}, {order.shippingAddress.ward},{' '}
              {order.shippingAddress.district}, {order.shippingAddress.city}
              {order.shippingAddress.zipCode && ` - ${order.shippingAddress.zipCode}`}
            </p>
          </div>
        )}

        {/* Payment */}
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-2">Thanh toán</h2>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Phương thức</span>
              <span className="font-medium">
                {{
                  vnpay: '💳 VNPay',
                  momo: '💜 MoMo',
                  cod: '💵 Tiền mặt',
                }[order.paymentMethod] ?? order.paymentMethod}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Trạng thái</span>
              <span className={`font-medium ${getPaymentStatusColor(order.paymentStatus).replace('bg-', 'text-').split(' ')[0]}`}>
                {PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Link href="/orders" className="btn-secondary">
          ← Quay lại
        </Link>
        <Link href="/products" className="btn-primary">
          Tiếp tục mua sắm
        </Link>
      </div>
    </div>
  );
}
