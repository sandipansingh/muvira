import React, { useState, useEffect } from 'react';
import { adminApiService } from '../../lib/api/admin';
import type { Category } from '../../types/category';
import { useToast } from '../../hooks/useToast';
import Card, { CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Dialog from '../../components/ui/Dialog';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/shared/ErrorState';
import { Plus, Pencil, Trash } from 'lucide-react';

export const CategoriesList: React.FC = () => {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Dialog states
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    const res = await adminApiService.getCategoriesList();
    if (res.success) {
      setCategories(res.data);
    } else {
      setError(res.error.message || 'Failed to fetch categories.');
    }
    setLoading(false);
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setName('');
    setDescription('');
    setImageUrl('');
    setSortOrder(categories.length.toString());
    setIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditId(cat.id);
    setName(cat.name);
    setDescription(cat.description);
    setImageUrl(cat.imageUrl);
    setSortOrder(cat.sortOrder.toString());
    setIsActive(cat.isActive ?? true);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !imageUrl) {
      showToast('Please fill in all mandatory fields.', 'error');
      return;
    }

    setSaving(true);
    let res;
    const payload = {
      name,
      description,
      imageUrl,
      sortOrder: parseInt(sortOrder, 10),
      isActive,
    };

    if (editId) {
      res = await adminApiService.updateCategory(editId, payload);
    } else {
      res = await adminApiService.createCategory(payload);
    }
    setSaving(false);

    if (res.success) {
      showToast(editId ? 'Category updated' : 'Category created', 'success');
      setModalOpen(false);
      fetchCategories();
    } else {
      showToast(res.error.message || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;

    const res = await adminApiService.deleteCategory(id);
    if (res.success) {
      showToast(`Category "${name}" deleted.`, 'success');
      fetchCategories();
    } else {
      showToast(res.error.message || 'Failed to delete category.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-redhat text-left">
      {/* Title */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-wide text-darkColor">
            Category Management
          </h2>
          <p className="text-xs text-secondary500 tracking-wide mt-1">
            Configure collections, image tiles, description tags, and sort orders.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleOpenAdd}
          className="text-xs md:text-sm py-2 px-4 flex items-center gap-1 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {/* TABLE */}
      <Card className="border border-secondary200 shadow-sm">
        <CardContent className="p-0">
          {error ? (
            <ErrorState message={error} onRetry={fetchCategories} />
          ) : loading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-10 text-xs md:text-sm text-secondary500">
              No categories found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tile</TableHead>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Slug Url</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <div className="w-12 h-12 bg-lightgrayColor border border-secondary200 rounded overflow-hidden shrink-0">
                          <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-darkColor leading-none">{cat.name}</p>
                        <p className="text-[10px] text-secondary500 truncate max-w-[200px] mt-1.5 leading-snug">
                          {cat.description}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs font-normal text-secondary600 font-roboto">
                        {cat.slug}
                      </TableCell>
                      <TableCell className="font-medium text-secondary700">
                        {cat.sortOrder}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cat.isActive !== false ? 'success' : 'neutral'}>
                          {cat.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-3.5">
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            className="text-secondary500 hover:text-darkColor p-1 transition-colors focus:outline-none"
                            title="Edit Category"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id, cat.name)}
                            className="text-secondary500 hover:text-darkColor p-1 transition-colors focus:outline-none"
                            title="Delete"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* DIALOG FOR CREATE/EDIT */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Category' : 'Create Category'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Category Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="E.g. Solid Wood Furniture"
            required
          />

          <Input
            label="Image URL Tile *"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://images.unsplash.com/..."
            required
          />

          <Input
            label="Sort Order Value *"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="0"
            required
          />

          <Textarea
            label="Collection Description *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief tagline description..."
            rows={3}
            required
          />

          <label className="flex items-center gap-2 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-primaryBg"
            />
            <span className="text-xs font-semibold text-secondary600">Category is Active</span>
          </label>

          <Button type="submit" loading={saving} className="w-full py-2.5">
            {editId ? 'Save Changes' : 'Create Category Collection'}
          </Button>
        </form>
      </Dialog>
    </div>
  );
};

export default CategoriesList;
