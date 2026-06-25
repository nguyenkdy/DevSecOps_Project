'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { paymentsApi } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { formatVND } from '@/lib/utils';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();

  const orderId = searchParams.get('orderId') ?? '';
  const amount = Number(searchParams.get('amount') ?? 0);
  const method = searchParams.get('method') ?? 'momo';

  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState<{
    paymentRef: string;
    qrCode: string;
    paymentUrl: string;
    transactionId: string;
  } | null>(null);

  useEffect(() => {
    if (!orderId) {
      router.push('/');
      return;
    }

    paymentsApi
      .initPayment({ orderId, amount, paymentMethod: method })
      .then((data: unknown) => setPayment(data as typeof payment))
      .catch(() => setError('Không thể khởi tạo thanh toán'))
      .finally(() => setLoading(false));
  }, [orderId, amount, method, router]);

  const handleAutoApprove = async () => {
    if (!payment) return;
    setApproving(true);
    try {
      await paymentsApi.autoApprove(payment.paymentRef);
      clearCart();
      router.push(`/payment-callback?orderId=${orderId}&status=success`);
    } catch {
      setError('Thanh toán thất bại');
      setApproving(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="card p-6 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Thanh toán đơn hàng</h1>
        <p className="text-sm text-gray-500 mb-2">Mã đơn: {orderId.substring(0, 8)}...</p>
        <p className="text-2xl font-bold text-blue-600 mb-6">{formatVND(amount)}</p>

        {error && <Alert type="error" message={error} />}

        {payment && (
          <>
            <div className="bg-gray-50 rounded-xl p-4 mb-6 inline-block">
              <p className="text-xs text-gray-500 mb-3">
                Quét mã QR {method === 'momo' ? 'MoMo' : ''} để thanh toán (demo)
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={payment.qrCode}
                alt="QR Code thanh toán"
                className="w-48 h-48 mx-auto"
              />
              <p className="text-xs text-gray-400 mt-2 font-mono break-all">
                {payment.paymentRef}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 text-left">
              <p className="text-xs font-semibold text-blue-800 mb-1">
                🎮 Chế độ Demo
              </p>
              <p className="text-xs text-blue-700">
                Đây là thanh toán giả lập. Nhấn nút bên dưới để giả lập quét QR thành công.
              </p>
            </div>

            <button
              onClick={handleAutoApprove}
              disabled={approving}
              className="btn-primary w-full text-center"
            >
              {approving ? '⏳ Đang xử lý...' : '✅ Xác nhận thanh toán (Demo)'}
            </button>

            <p className="text-xs text-gray-400 mt-4">
              Hoặc truy cập:{' '}
              <a href={payment.paymentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                VNPay sandbox
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense>
      <PaymentContent />
    </Suspense>
  );
}
