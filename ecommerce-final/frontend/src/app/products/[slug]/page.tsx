'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { productsApi } from '@/lib/api';
import { formatVND, getThumbnailUrl } from '@/lib/utils';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import type { Product } from '@/lib/types';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    const slug = params.slug as string;
    productsApi.getBySlug(slug)
      .then((data) => setProduct(data as Product))
      .catch(() => setError('Không tìm thấy sản phẩm'))
      .finally(() => setLoading(false));
  }, [params.slug]);

  if (loading) return <PageLoading />;
  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Alert type="error" message={error || 'Sản phẩm không tồn tại'} />
        <Link href="/products" className="btn-primary mt-4 inline-block">
          Quay lại
        </Link>
      </div>
    );
  }

  const images = product.images ?? [];
  const currentImage = images[activeImg]?.url ?? getThumbnailUrl(images);
  const outOfStock = product.stockQty === 0;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      unitPrice: Number(product.price),
      quantity: qty,
      imageUrl: getThumbnailUrl(images),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/cart');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-blue-600">Trang chủ</Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-blue-600">Sản phẩm</Link>
        {product.category && (
          <>
            <span className="mx-2">/</span>
            <span>{product.category.name}</span>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 mb-3">
            {currentImage !== '/placeholder.png' ? (
              <Image src={currentImage} alt={product.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={img.key}
                  onClick={() => setActiveImg(i)}
                  className={`shrink-0 relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activeImg ? 'border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <Image src={img.url} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.category && (
            <span className="text-xs text-blue-600 font-medium uppercase tracking-wide">
              {product.category.name}
            </span>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-3">{product.name}</h1>
          <p className="text-3xl font-bold text-blue-600 mb-4">
            {formatVND(Number(product.price))}
          </p>

          <div className="flex items-center gap-2 mb-6">
            <span className={`text-sm font-medium ${outOfStock ? 'text-red-500' : 'text-green-600'}`}>
              {outOfStock ? 'Hết hàng' : `Còn ${product.stockQty} sản phẩm`}
            </span>
          </div>

          {!outOfStock && (
            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm text-gray-600">Số lượng:</span>
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-l-lg"
                >
                  -
                </button>
                <span className="px-4 py-1.5 text-sm font-medium min-w-[2.5rem] text-center">
                  {qty}
                </span>
                <button
                  onClick={() => setQty(Math.min(product.stockQty, qty + 1))}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-r-lg"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {added && <Alert type="success" message="Đã thêm vào giỏ hàng!" />}

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className="btn-secondary flex-1"
            >
              Thêm vào giỏ
            </button>
            <button
              onClick={handleBuyNow}
              disabled={outOfStock}
              className="btn-primary flex-1"
            >
              Mua ngay
            </button>
          </div>

          {product.description && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-2">Mô tả sản phẩm</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
