import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { adminMockService } from '../../mocks/admin.mock';
import { categoriesMockService } from '../../mocks/categories.mock';
import type { ProductDetail } from '../../types/product';
import type { Category } from '../../types/category';
import { useToast } from '../../hooks/useToast';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Upload, Sparkles } from 'lucide-react';

export const ProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form Fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priceRupees, setPriceRupees] = useState('');
  const [salePriceRupees, setSalePriceRupees] = useState('');
  const [stock, setStock] = useState('10');
  const [sku, setSku] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Metadata Specs
  const [metadataRows, setMetadataRows] = useState<Array<{ key: string; val: string }>>([]);

  // Images state
  const [images, setImages] = useState<ProductDetail['images']>([]);
  const [uploadUrl, setUploadUrl] = useState('');

  useEffect(() => {
    fetchCategories();
    if (isEdit) {
      fetchProductDetails();
    }
  }, [id]);

  const fetchCategories = async () => {
    const res = await categoriesMockService.getCategories();
    if (res.success) {
      setCategories(res.data);
      if (!isEdit && res.data.length > 0) {
        setCategoryId(res.data[0].id);
      }
    }
  };

  const fetchProductDetails = async () => {
    setLoading(true);
    const res = await adminMockService.getProducts();
    if (res.success) {
      const prod = res.data.find((p) => p.id === id);
      if (prod) {
        setName(prod.name);
        setCategoryId(prod.category.id);
        setPriceRupees((prod.price / 100).toString());
        setSalePriceRupees(prod.salePrice !== null ? (prod.salePrice / 100).toString() : '');
        setStock(prod.stock.toString());
        setSku(prod.sku);
        setShortDescription(prod.shortDescription);
        setDescription(prod.description);
        setIsFeatured(prod.isFeatured);
        setIsActive(prod.isActive);
        setImages(prod.images || []);

        // Load spec metadata
        const rows = Object.entries(prod.metadata || {}).map(([k, v]) => ({ key: k, val: v }));
        setMetadataRows(rows);
      } else {
        showToast('Product not found.', 'error');
        navigate('/admin/products');
      }
    }
    setLoading(false);
  };

  const handleMetadataAddRow = () => {
    setMetadataRows((prev) => [...prev, { key: '', val: '' }]);
  };

  const handleMetadataRemoveRow = (idx: number) => {
    setMetadataRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMetadataChange = (idx: number, field: 'key' | 'val', val: string) => {
    setMetadataRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  };

  // Image upload simulation
  const handleImageUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl.trim()) return;

    if (isEdit) {
      setSaving(true);
      const res = await adminMockService.uploadProductImages(id, [uploadUrl.trim()]);
      setSaving(false);
      if (res.success) {
        showToast('Image uploaded successfully', 'success');
        setImages((prev) => [...prev, ...res.data]);
        setUploadUrl('');
      } else {
        showToast(res.error.message || 'Upload failed', 'error');
      }
    } else {
      // For create mode, save locally in images state first
      const newImg = {
        id: 'img-temp-' + Math.random().toString(36).substring(2, 9),
        url: uploadUrl.trim(),
        altText: 'Preview',
        isPrimary: images.length === 0,
        sortOrder: images.length,
      };
      setImages((prev) => [...prev, newImg]);
      setUploadUrl('');
      showToast('Image preview added.', 'info');
    }
  };

  // Direct file input simulation
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setUploadUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageDelete = async (imgId: string) => {
    if (isEdit) {
      setSaving(true);
      const res = await adminMockService.deleteProductImage(id, imgId);
      setSaving(false);
      if (res.success) {
        showToast('Image removed', 'success');
        setImages((prev) => prev.filter((img) => img.id !== imgId));
      } else {
        showToast(res.error.message || 'Remove failed', 'error');
      }
    } else {
      setImages((prev) => prev.filter((img) => img.id !== imgId));
    }
  };

  const handleImageReorder = async (imgId: string, direction: 'up' | 'down') => {
    const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((img) => img.id === imgId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = sorted[index];
      sorted[index] = sorted[index - 1];
      sorted[index - 1] = temp;
    } else if (direction === 'down' && index < sorted.length - 1) {
      const temp = sorted[index];
      sorted[index] = sorted[index + 1];
      sorted[index + 1] = temp;
    }

    // Remap sortOrders
    const remapped = sorted.map((img, idx) => ({ ...img, sortOrder: idx, isPrimary: idx === 0 }));
    setImages(remapped);

    if (isEdit) {
      setSaving(true);
      await adminMockService.reorderProductImages(
        id,
        remapped.map((i) => i.id)
      );
      setSaving(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !categoryId || !priceRupees || !stock || !sku) {
      showToast('Please fill in all mandatory fields.', 'error');
      return;
    }

    // Convert Rupees float to Paisa integer
    const pricePaisa = Math.round(parseFloat(priceRupees) * 100);
    const salePricePaisa = salePriceRupees ? Math.round(parseFloat(salePriceRupees) * 100) : null;
    const stockNum = parseInt(stock, 10);

    // Build specs metadata
    const metadataObj: Record<string, string> = {};
    metadataRows.forEach((r) => {
      if (r.key.trim()) {
        metadataObj[r.key.trim().toLowerCase()] = r.val.trim();
      }
    });

    // Validate images
    if (images.length === 0) {
      showToast('Please upload or enter at least one product image.', 'error');
      return;
    }

    const payload = {
      name,
      categoryId,
      price: pricePaisa,
      salePrice: salePricePaisa,
      stock: stockNum,
      sku,
      shortDescription,
      description,
      isFeatured,
      isActive,
      metadata: metadataObj,
      images, // pass image array
    };

    setSaving(true);
    let res;
    if (isEdit) {
      res = await adminMockService.updateProduct(id, payload as any);
    } else {
      res = await adminMockService.createProduct(payload as any);
    }
    setSaving(false);

    if (res.success) {
      showToast(isEdit ? 'Design updated successfully' : 'New design created', 'success');
      navigate('/admin/products');
    } else {
      showToast(res.error.message || 'Submit operation failed', 'error');
    }
  };

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  if (loading) {
    return <LoadingSpinner fullPage={true} />;
  }

  return (
    <div className="space-y-6 font-redhat text-left max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/products"
          className="border border-secondary300 bg-white p-2 rounded-full hover:bg-lightgrayColor transition-colors shrink-0"
        >
          <ArrowLeft className="w-4.5 h-4.5 text-secondary700" />
        </Link>
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-wide text-darkColor">
            {isEdit ? 'Edit Design Product' : 'Create New Design Product'}
          </h2>
          <p className="text-xs text-secondary500 tracking-wide mt-1">
            Fill in pricing, dimensions spec sheets, and upload product angles.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: main product details */}
        <form onSubmit={handleFormSubmit} className="md:col-span-2 space-y-6">
          <Card className="border border-secondary200">
            <CardHeader>
              <CardTitle>Core Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Product Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sheesham Wood Sofa, Indigo Cotton Kurta..."
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Category Collection *"
                  options={categoryOptions}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                />
                <Input
                  label="SKU ID Code *"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="MUV-KUR-100"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Original Price (₹) *"
                  type="number"
                  step="0.01"
                  value={priceRupees}
                  onChange={(e) => setPriceRupees(e.target.value)}
                  placeholder="1499.00"
                  required
                />
                <Input
                  label="Sale Price (₹) (Optional)"
                  type="number"
                  step="0.01"
                  value={salePriceRupees}
                  onChange={(e) => setSalePriceRupees(e.target.value)}
                  placeholder="1199.00"
                />
                <Input
                  label="Available Stock *"
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="20"
                  required
                />
              </div>

              <Input
                label="Tagline Summary (Short Description) *"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Jaipur blockprinted cotton kurta"
              />

              <Textarea
                label="Long description *"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Full detail description here..."
              />

              <div className="flex gap-6 py-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4.5 h-4.5 accent-primaryBg cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-secondary700">Set as Featured design</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4.5 h-4.5 accent-primaryBg cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-secondary700">Product is Active (Visible to users)</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* SPECIFICATION SHEET */}
          <Card className="border border-secondary200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Detailed Spec Sheet</CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMetadataAddRow}
                className="text-xs bg-white py-1.5 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Spec
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {metadataRows.length === 0 ? (
                <p className="text-xs text-secondary500 leading-relaxed py-2">
                  No custom specifications set. Add fields like Material, Dimensions, Wood, Finish, or Size.
                </p>
              ) : (
                metadataRows.map((row, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <Input
                      placeholder="Spec Key (e.g. Material)"
                      value={row.key}
                      onChange={(e) => handleMetadataChange(idx, 'key', e.target.value)}
                      className="text-xs py-1.5"
                    />
                    <Input
                      placeholder="Spec Value (e.g. Teak wood)"
                      value={row.val}
                      onChange={(e) => handleMetadataChange(idx, 'val', e.target.value)}
                      className="text-xs py-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => handleMetadataRemoveRow(idx)}
                      className="text-rose-600 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Button type="submit" loading={saving} className="w-full py-3.5 text-sm">
            {isEdit ? 'Save Design Adjustments' : 'Create New Design catalog'}
          </Button>
        </form>

        {/* Right column: Image gallery uploading and sorting */}
        <div className="space-y-6">
          <Card className="border border-secondary200 text-left">
            <CardHeader>
              <CardTitle>Image Attachments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add image URL input */}
              <form onSubmit={handleImageUpload} className="space-y-3">
                <Input
                  label="Image URL Link"
                  placeholder="https://images.unsplash.com/..."
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  className="text-xs"
                />
                
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="text-xs flex-grow flex items-center justify-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    Add URL Link
                  </Button>
                  <label className="border border-secondary300 text-secondary700 rounded-3xl hover:bg-lightgrayColor px-4 py-1.5 text-xs font-semibold tracking-wide flex items-center gap-1.5 cursor-pointer justify-center">
                    <input type="file" onChange={handleFileInput} accept="image/*" className="hidden" />
                    Browse
                  </label>
                </div>
              </form>

              {/* List images */}
              <div className="space-y-3.5 pt-2">
                <span className="text-[10px] font-bold text-secondary500 uppercase tracking-widest block pl-0.5">
                  Gallery angles list (First image is Primary cover)
                </span>

                {images.length === 0 ? (
                  <div className="border-2 border-dashed border-secondary300 rounded-xl p-6 text-center text-xs text-secondary500 flex flex-col items-center justify-center gap-2 select-none">
                    <Sparkles className="w-6 h-6 text-secondary400" />
                    No images uploaded yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {images
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((img, index) => (
                        <div
                          key={img.id}
                          className="flex items-center gap-3 p-2 bg-lightgrayColor border border-secondary200 rounded-xl justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 bg-white rounded overflow-hidden border border-secondary200 shrink-0">
                              <img src={img.url} alt="angle" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[10px] text-secondary600 font-medium">
                              {index === 0 ? 'Primary Cover' : `Angle #${index}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleImageReorder(img.id, 'up')}
                              disabled={index === 0 || saving}
                              className="text-secondary500 hover:text-darkColor p-1 disabled:opacity-30"
                              title="Move Up"
                            >
                              <ArrowUp className="w-4.5 h-4.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleImageReorder(img.id, 'down')}
                              disabled={index === images.length - 1 || saving}
                              className="text-secondary500 hover:text-darkColor p-1 disabled:opacity-30"
                              title="Move Down"
                            >
                              <ArrowDown className="w-4.5 h-4.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleImageDelete(img.id)}
                              disabled={saving}
                              className="text-rose-600 hover:text-rose-700 p-1 pl-2"
                              title="Delete Angle"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
