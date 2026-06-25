'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { formatVND } from '@/lib/utils';

export default function CartPage() {
  const { items, totalItems, totalPrice, updateQty, removeItem, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h1>
        <p className="text-gray-500 mb-6">Hãy thêm sản phẩm vào giỏ hàng</p>
        <Link href="/products" className="btn-primary">
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Giỏ hàng ({totalItems} sản phẩm)
        </h1>
        <button
          onClick={clearCart}
          className="text-sm text-red-500 hover:text-red-700"
        >
          Xóa tất cả
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="card p-4 flex gap-4">
              {/* Ảnh */}
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">
                    📦
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${item.productSlug}`}
                  className="font-medium text-gray-900 hover:text-blue-600 text-sm line-clamp-2"
                >
                  {item.productName}
                </Link>
                <p className="text-blue-600 font-bold mt-1">
                  {formatVND(item.unitPrice)}
                </p>
              </div>

              {/* Qty + Remove */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => updateQty(item.productId, item.quantity - 1)}
                    className="px-2 py-1 text-gray-600 hover:bg-gray-50 rounded-l-lg text-sm"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQty(item.productId, item.quantity + 1)}
                    className="px-2 py-1 text-gray-600 hover:bg-gray-50 rounded-r-lg text-sm"
                  >
                    +
                  </button>
                </div>

                <span className="text-sm font-semibold text-gray-900">
                  {formatVND(item.unitPrice * item.quantity)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-24">
            <h2 className="font-bold text-gray-900 mb-4">Tóm tắt đơn hàng</h2>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Tạm tính ({totalItems} sản phẩm)</span>
                <span>{formatVND(totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phí vận chuyển</span>
                <span className="text-green-600">Miễn phí</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 mb-5">
              <div className="flex justify-between font-bold text-lg">
                <span>Tổng cộng</span>
                <span className="text-blue-600">{formatVND(totalPrice)}</span>
              </div>
            </div>

            <Link href="/checkout" className="btn-primary w-full text-center block">
              Tiến hành đặt hàng
            </Link>
            <Link href="/products" className="btn-secondary w-full text-center block mt-2">
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
