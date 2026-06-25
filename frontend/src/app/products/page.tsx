import { ProductCard } from '@/components/products/ProductCard';
import type { Product, Category } from '@/lib/types';

interface SearchParams {
  page?: string;
  search?: string;
  categoryId?: string;
}

async function getProducts(params: SearchParams) {
  const baseUrl = process.env.API_URL ?? 'http://localhost:3000';
  const qs = new URLSearchParams();
  qs.set('limit', '16');
  qs.set('page', params.page ?? '1');
  if (params.search) qs.set('search', params.search);
  if (params.categoryId) qs.set('categoryId', params.categoryId);

  try {
    const res = await fetch(`${baseUrl}/api/v1/products?${qs}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return { data: [], total: 0, totalPages: 0, page: 1 };
    const json = await res.json();
    return json ?? { data: [], total: 0, totalPages: 0, page: 1 };
  } catch {
    return { data: [], total: 0, totalPages: 0, page: 1 };
  }
}

async function getCategories(): Promise<Category[]> {
  const baseUrl = process.env.API_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/v1/categories`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : (json.data ?? []);
  } catch {
    return [];
  }
}

// Next.js 15: searchParams là Promise trong server components
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const [result, categories] = await Promise.all([
    getProducts(params),
    getCategories(),
  ]);

  const products: Product[] = result.data ?? [];
  const currentPage = Number(params.page ?? 1);
  const totalPages: number = result.totalPages ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tất cả sản phẩm</h1>

      <div className="flex gap-6">
        {/* Sidebar filter */}
        <aside className="hidden md:block w-56 shrink-0">
          <div className="card p-4">
            <h2 className="font-semibold text-gray-900 mb-3 text-sm">Danh mục</h2>
            <ul className="space-y-1">
              <li>
                <a
                  href="/products"
                  className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    !params.categoryId
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Tất cả
                </a>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <a
                    href={`/products?categoryId=${cat.id}${params.search ? `&search=${params.search}` : ''}`}
                    className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      params.categoryId === cat.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cat.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Search bar */}
          <form method="GET" action="/products" className="mb-6">
            <div className="flex gap-2">
              <input
                name="search"
                defaultValue={params.search}
                placeholder="Tìm kiếm sản phẩm..."
                className="input-field flex-1"
              />
              {params.categoryId && (
                <input type="hidden" name="categoryId" value={params.categoryId} />
              )}
              <button type="submit" className="btn-primary px-6">
                Tìm
              </button>
            </div>
          </form>

          {/* Results */}
          {params.search && (
            <p className="text-sm text-gray-500 mb-4">
              Kết quả tìm kiếm: &ldquo;{params.search}&rdquo; — {result.total} sản phẩm
            </p>
          )}

          {products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500">
              <p>Không tìm thấy sản phẩm nào</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const qs = new URLSearchParams();
                qs.set('page', String(p));
                if (params.search) qs.set('search', params.search);
                if (params.categoryId) qs.set('categoryId', params.categoryId);
                return (
                  <a
                    key={p}
                    href={`/products?${qs}`}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      p === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
