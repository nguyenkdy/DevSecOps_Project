'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { ordersApi, walletApi } from '@/lib/api';
import { formatVND } from '@/lib/utils';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function CheckoutPage() {
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'ecompay' | 'momo' | 'cod'>('ecompay');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [toppingUp, setToppingUp] = useState(false);

  const [address, setAddress] = useState({
    street: '',
    ward: '',
    district: '',
    city: '',
    zipCode: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      walletApi.getBalance().then((r) => setWalletBalance(r.balance)).catch(() => {});
    }
  }, [isAuthenticated]);

  const handleTopUp = async () => {
    setToppingUp(true);
    try {
      const r = await walletApi.topUp();
      setWalletBalance(r.balance);
    } finally {
      setToppingUp(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Alert type="info" message="Vui lòng đăng nhập để đặt hàng" />
        <Link href="/login" className="btn-primary mt-4 inline-block">
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Alert type="info" message="Giỏ hàng trống" />
        <Link href="/products" className="btn-primary mt-4 inline-block">
          Mua sắm ngay
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const order = await ordersApi.checkout({
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        shippingAddress: address,
        paymentMethod,
      });

      if (paymentMethod === 'momo') {
        // MoMo → trang QR (cart sẽ được xóa sau khi quét QR thành công)
        router.push(`/checkout/payment?orderId=${order.id}&amount=${order.totalAmount}&method=momo`);
      } else {
        // EcomPay (instant) hoặc COD → xóa cart và vào đơn hàng
        clearCart();
        router.push(`/orders/${order.id}?success=1`);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Đặt hàng thất bại, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Thanh toán</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Shipping */}
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Địa chỉ giao hàng</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Địa chỉ *</label>
                  <input
                    required
                    className="input-field"
                    placeholder="Số nhà, tên đường"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Phường/Xã *</label>
                  <input
                    required
                    className="input-field"
                    value={address.ward}
                    onChange={(e) => setAddress({ ...address, ward: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Quận/Huyện *</label>
                  <input
                    required
                    className="input-field"
                    value={address.district}
                    onChange={(e) => setAddress({ ...address, district: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tỉnh/Thành phố *</label>
                  <input
                    required
                    className="input-field"
                    placeholder="Hà Nội, TP.HCM..."
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Mã bưu điện</label>
                  <input
                    className="input-field"
                    value={address.zipCode}
                    onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Phương thức thanh toán</h2>
              <div className="space-y-2">
                {/* EcomPay */}
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    paymentMethod === 'ecompay'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="ecompay"
                    checked={paymentMethod === 'ecompay'}
                    onChange={() => setPaymentMethod('ecompay')}
                    className="text-blue-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">💰 EcomPay — Ví điện tử</p>
                    <p className="text-xs text-gray-500">
                      Thanh toán ngay từ số dư ví •{' '}
                      {walletBalance !== null ? (
                        <span className={walletBalance >= totalPrice ? 'text-green-600' : 'text-red-500'}>
                          Số dư: {formatVND(walletBalance)}
                        </span>
                      ) : (
                        <span className="text-gray-400">Đang tải...</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTopUp}
                    disabled={toppingUp}
                    className="text-xs text-blue-600 hover:underline shrink-0"
                  >
                    {toppingUp ? '...' : '+ Nạp 500K'}
                  </button>
                </label>

                {/* MoMo */}
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    paymentMethod === 'momo'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="momo"
                    checked={paymentMethod === 'momo'}
                    onChange={() => setPaymentMethod('momo')}
                    className="text-blue-600"
                  />
                  <div>
                    <p className="font-medium text-sm">💜 MoMo</p>
                    <p className="text-xs text-gray-500">Thanh toán qua ví MoMo (demo QR)</p>
                  </div>
                </label>

                {/* COD */}
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    paymentMethod === 'cod'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="text-blue-600"
                  />
                  <div>
                    <p className="font-medium text-sm">💵 Tiền mặt khi nhận hàng</p>
                    <p className="text-xs text-gray-500">Thanh toán khi giao hàng</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="card p-5 sticky top-24">
              <h2 className="font-bold text-gray-900 mb-4">
                Đơn hàng ({totalItems} sản phẩm)
              </h2>
              <div className="space-y-2 text-sm mb-4 max-h-48 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between gap-2">
                    <span className="text-gray-600 truncate">
                      {item.productName} × {item.quantity}
                    </span>
                    <span className="shrink-0 font-medium">
                      {formatVND(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 mb-5">
                <div className="flex justify-between font-bold text-lg">
                  <span>Tổng cộng</span>
                  <span className="text-blue-600">{formatVND(totalPrice)}</span>
                </div>
              </div>

              {error && <Alert type="error" message={error} />}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-3 flex items-center justify-center gap-2"
              >
                {loading && <LoadingSpinner className="w-4 h-4" />}
                {paymentMethod === 'ecompay'
                ? 'Thanh toán bằng EcomPay'
                : paymentMethod === 'cod'
                ? 'Xác nhận đặt hàng'
                : 'Tiến hành thanh toán'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
