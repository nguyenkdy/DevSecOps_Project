import Link from 'next/link';
import { ProductCard } from '@/components/products/ProductCard';
import type { Product, ProductListResponse } from '@/lib/types';

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const baseUrl = process.env.API_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/v1/products?limit=8&page=1`, {
      next: { revalidate: 60 }, // ISR: revalidate sau 60 giây
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const products = await getFeaturedProducts();

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Mua sắm thông minh, tiết kiệm tối đa
          </h1>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            Hàng nghìn sản phẩm chính hãng, giao hàng nhanh toàn quốc
          </p>
          <Link
            href="/products"
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Khám phá ngay
          </Link>
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Sản phẩm nổi bật</h2>
          <Link href="/products" className="text-blue-600 text-sm font-medium hover:underline">
            Xem tất cả →
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">Chưa có sản phẩm nào</p>
            <p className="text-sm mt-1">Hãy thêm sản phẩm vào hệ thống</p>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { icon: '🚚', title: 'Giao hàng nhanh', desc: 'Giao hàng toàn quốc trong 2-5 ngày' },
              { icon: '🔒', title: 'Thanh toán an toàn', desc: 'Hỗ trợ VNPay, MoMo, COD' },
              { icon: '↩️', title: 'Đổi trả dễ dàng', desc: 'Hoàn tiền 100% nếu không hài lòng' },
            ].map((f) => (
              <div key={f.title} className="p-6">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
