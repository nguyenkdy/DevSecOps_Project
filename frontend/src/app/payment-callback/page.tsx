'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const orderId = searchParams.get('orderId');
  const isSuccess = status === 'success';

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="card p-8">
        <div className="text-6xl mb-4">{isSuccess ? '✅' : '❌'}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
        </h1>
        <p className="text-gray-500 mb-6 text-sm">
          {isSuccess
            ? 'Đơn hàng của bạn đã được xác nhận. Chúng tôi sẽ giao hàng sớm nhất có thể.'
            : 'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.'}
        </p>

        <div className="flex flex-col gap-2">
          {isSuccess && orderId && (
            <Link href={`/orders/${orderId}`} className="btn-primary">
              Xem đơn hàng
            </Link>
          )}
          <Link href="/orders" className="btn-secondary">
            Lịch sử đơn hàng
          </Link>
          <Link href="/products" className="text-sm text-blue-600 hover:underline mt-1">
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    </div>
  );
}
