import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminApiService } from '../../lib/api/admin';
import type { ProductDetail } from '../../types/product';
import { formatPrice } from '../../lib/format';
import { useToast } from '../../hooks/useToast';
import Card, { CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Pagination from '../../components/ui/Pagination';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/shared/ErrorState';
import { Search, Plus, Pencil, Trash } from 'lucide-react';
import { categoriesApiService } from '../../lib/api/categories';
import type { Category } from '../../types/category';

export const ProductsList: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync inputs with URL params
  const q = searchParams.get('q') || '';
  const categoryId = searchParams.get('category') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [q, categoryId, page]);

  const fetchCategories = async () => {
    const res = await categoriesApiService.getCategories();
    if (res.success) {
      setCategories(res.data);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    const res = await adminApiService.getProducts({
      page,
      limit: 10,
      q,
      category: categoryId,
    });

    if (res.success) {
      setProducts(res.data);
      setPagination(res.pagination);
    } else {
      setError(res.error.message || 'Failed to fetch catalog.');
    }
    setLoading(false);
  };

  const updateParam = (key: string, value: string) => {
    const updated = new URLSearchParams(searchParams);
    if (value === '') {
      updated.delete(key);
    } else {
      updated.set(key, value);
    }
    if (key !== 'page') {
      updated.delete('page');
    }
    setSearchParams(updated);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate/soft-delete "${name}"?`)) return;

    const res = await adminApiService.deleteProduct(id);
    if (res.success) {
      showToast(`Product "${name}" soft-deleted successfully (isActive = false).`, 'success');
      fetchProducts();
    } else {
      showToast(res.error.message || 'Failed to delete product.', 'error');
    }
  };

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="space-y-6 font-redhat text-left">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-wide text-darkColor">
            Catalog Management
          </h2>
          <p className="text-xs text-secondary500 tracking-wide mt-1">
            Create, update, reorder images, and adjust stock configurations of designs.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/admin/products/new')}
          className="text-xs md:text-sm py-2 px-4 flex items-center gap-1 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Button>
      </div>

      {/* Filter Options Bar */}
      <Card className="border border-secondary200">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          {/* Query search */}
          <div className="relative w-full md:max-w-xs flex items-center">
            <input
              type="text"
              placeholder="Search product name, SKU..."
              value={q}
              onChange={(e) => updateParam('q', e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-xs border border-secondary300 rounded-lg text-darkColor placeholder-secondary400 focus:outline-none focus:border-primaryBg"
            />
            <Search className="absolute left-3 w-4 h-4 text-secondary400" />
          </div>

          {/* Category pick */}
          <div className="w-full md:max-w-xs">
            <Select
              options={categoryOptions}
              value={categoryId}
              onChange={(e) => updateParam('category', e.target.value)}
              className="!py-1.5 !text-xs border-secondary300"
            />
          </div>
        </CardContent>
      </Card>

      {/* PRODUCTS CATALOG LIST TABLE */}
      <Card className="border border-secondary200 shadow-sm">
        <CardContent className="p-0">
          {error ? (
            <ErrorState message={error} onRetry={fetchProducts} />
          ) : loading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-10 text-xs md:text-sm text-secondary500">
              No matching products found in database.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Design Details</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price (INR)</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((prod) => {
                  const hasDiscount = prod.salePrice !== null;
                  const currentPrice = hasDiscount && prod.salePrice !== null ? prod.salePrice : prod.price;
                  const primaryImg = prod.images.find((img) => img.isPrimary) || prod.images[0];

                  return (
                    <TableRow key={prod.id}>
                      {/* Thumbnail */}
                      <TableCell>
                        <div className="w-12 h-12 bg-lightgrayColor border border-secondary200 rounded overflow-hidden shrink-0">
                          {primaryImg?.url ? (
                            <img src={primaryImg.url} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-secondary400">
                              No image
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Info */}
                      <TableCell>
                        <p className="font-medium text-darkColor leading-none truncate max-w-[180px]">{prod.name}</p>
                        <p className="text-[10px] text-secondary500 font-medium font-roboto mt-1 uppercase tracking-wider">
                          SKU: {prod.sku}
                        </p>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="text-xs font-medium text-secondary600 font-redhat">
                        {prod.category.name}
                      </TableCell>

                      {/* Price */}
                      <TableCell className="font-medium text-secondary700">
                        {formatPrice(currentPrice)}
                        {hasDiscount && (
                          <span className="text-[10px] text-secondary500 block leading-none mt-1 font-medium">
                            Discount active
                          </span>
                        )}
                      </TableCell>

                      {/* Stock */}
                      <TableCell>
                        <span className="text-xs font-medium text-secondary700">
                          {prod.stock} units
                        </span>
                        {prod.stock === 0 && (
                          <span className="text-[9px] font-medium text-secondary500 uppercase block mt-1 leading-none">
                            Out of stock
                          </span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant={prod.isActive ? 'success' : 'neutral'}>
                          {prod.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-3.5">
                          <button
                            onClick={() => navigate(`/admin/products/${prod.id}/edit`)}
                            className="text-secondary500 hover:text-darkColor p-1 transition-colors focus:outline-none"
                            title="Edit Product"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(prod.id, prod.name)}
                            disabled={!prod.isActive}
                            className="text-secondary500 hover:text-darkColor p-1 disabled:opacity-30 transition-colors focus:outline-none"
                            title="Soft Delete"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={(pageVal) => updateParam('page', pageVal.toString())}
      />
    </div>
  );
};

export default ProductsList;
