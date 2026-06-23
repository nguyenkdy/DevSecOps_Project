'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ordersApi } from '@/lib/api';
import { formatVND, formatDate, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, getOrderStatusColor, getPaymentStatusColor } from '@/lib/utils';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import type { Order } from '@/lib/types';

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/orders');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    ordersApi.list(page)
      .then((res: any) => {
        setOrders(res.data ?? []);
        setTotalPages(res.totalPages ?? 0);
      })
      .catch(() => setError('Không thể tải danh sách đơn hàng'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, page]);

  if (authLoading || loading) return <PageLoading />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Đơn hàng của tôi</h1>

      {error && <Alert type="error" message={error} />}

      {orders.length === 0 && !error ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-gray-500 mb-4">Bạn chưa có đơn hàng nào</p>
          <Link href="/products" className="btn-primary">
            Bắt đầu mua sắm
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <div className="card p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">
                      #{order.id.substring(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getOrderStatusColor(order.status)}`}>
                      {ORDER_STATUS_LABEL[order.status] ?? order.status}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
                      {PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="text-sm text-gray-600 mb-3">
                  {order.items.slice(0, 2).map((item) => (
                    <p key={item.productId} className="truncate">
                      • {item.productName} × {item.quantity}
                    </p>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-gray-400 text-xs">
                      +{order.items.length - 2} sản phẩm khác
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                  <span className="text-sm text-gray-500">
                    {order.items.reduce((s, i) => s + i.quantity, 0)} sản phẩm
                  </span>
                  <span className="font-bold text-blue-600">
                    {formatVND(Number(order.totalAmount))}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
