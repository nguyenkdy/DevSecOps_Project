'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { formatVND, getThumbnailUrl } from '@/lib/utils';
import type { Product } from '@/lib/types';

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
  const { addItem } = useCart();
  const thumbnail = getThumbnailUrl(product.images ?? []);
  const outOfStock = product.stockQty === 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (outOfStock) return;
    addItem({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      unitPrice: Number(product.price),
      quantity: 1,
      imageUrl: thumbnail,
    });
  };

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="card overflow-hidden hover:shadow-md transition-shadow">
        {/* Ảnh */}
        <div className="relative aspect-square bg-gray-100">
          {thumbnail !== '/placeholder.png' ? (
            <Image
              src={thumbnail}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {outOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-white text-gray-700 text-xs font-medium px-2 py-1 rounded">
                Hết hàng
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-xs text-gray-500 truncate">{product.category?.name ?? 'Chưa phân loại'}</p>
          <h3 className="font-medium text-gray-900 mt-1 line-clamp-2 text-sm leading-snug">
            {product.name}
          </h3>
          <div className="flex items-center justify-between mt-3">
            <span className="text-blue-600 font-bold">{formatVND(Number(product.price))}</span>
            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              + Giỏ
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
