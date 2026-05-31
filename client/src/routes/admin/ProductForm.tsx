import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { adminApiService } from "../../lib/api/admin";
import { categoriesApiService } from "../../lib/api/categories";
import type { ProductDetail } from "../../types/product";
import type { Category } from "../../types/category";
import { useToast } from "../../hooks/useToast";
import Card, {
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Textarea from "../../components/ui/Textarea";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  Sparkles,
  GripVertical,
} from "lucide-react";
import { uploadImage, deleteStorageFile } from "../../lib/storage";

export const ProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form Fields
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceRupees, setPriceRupees] = useState("");
  const [salePriceRupees, setSalePriceRupees] = useState("");
  const [stock, setStock] = useState("10");
  const [sku, setSku] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Metadata Specs
  const [metadataRows, setMetadataRows] = useState<
    Array<{ key: string; val: string }>
  >([]);

  // Images state
  const [images, setImages] = useState<ProductDetail["images"]>([]);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
    if (isEdit) {
      fetchProductDetails();
    }
  }, [id]);

  const fetchCategories = async () => {
    const res = await categoriesApiService.getCategories();
    if (res.success) {
      setCategories(res.data);
      if (!isEdit && res.data.length > 0) {
        setCategoryId(res.data[0].id);
      }
    }
  };

  const fetchProductDetails = async () => {
    setLoading(true);
    const res = await adminApiService.getProducts();
    if (res.success) {
      const prod = res.data.find((p) => p.id === id);
      if (prod) {
        setName(prod.name);
        setCategoryId(prod.category.id);
        setPriceRupees((prod.price / 100).toString());
        setSalePriceRupees(
          prod.salePrice !== null ? (prod.salePrice / 100).toString() : "",
        );
        setStock(prod.stock.toString());
        setSku(prod.sku);
        setShortDescription(prod.shortDescription);
        setDescription(prod.description);
        setIsFeatured(prod.isFeatured);
        setIsActive(prod.isActive);
        setImages(prod.images || []);

        // Load spec metadata
        const rows = Object.entries(prod.metadata || {}).map(([k, v]) => ({
          key: k,
          val: v,
        }));
        setMetadataRows(rows);
      } else {
        showToast("Product not found.", "error");
        navigate("/admin/products");
      }
    }
    setLoading(false);
  };

  const handleMetadataAddRow = () => {
    setMetadataRows((prev) => [...prev, { key: "", val: "" }]);
  };

  const handleMetadataRemoveRow = (idx: number) => {
    setMetadataRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMetadataChange = (
    idx: number,
    field: "key" | "val",
    val: string,
  ) => {
    setMetadataRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row)),
    );
  };

  // Paste external URL (kept for power users / external CDNs)
  const handleImageUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl.trim()) return;

    const url = uploadUrl.trim();

    if (isEdit && id) {
      setSaving(true);
      const res = await adminApiService.uploadProductImages(id, [url]);
      setSaving(false);
      if (res.success) {
        showToast("Image added", "success");
        setImages(res.data.images);
        setUploadUrl("");
      } else {
        showToast(res.error.message || "Failed to add image", "error");
      }
    } else {
      const newImg = {
        id: "img-temp-" + Math.random().toString(36).substring(2, 9),
        url,
        altText: "Preview",
        isPrimary: images.length === 0,
        sortOrder: images.length,
      };
      setImages((prev) => [...prev, newImg]);
      setUploadUrl("");
      showToast("Image added from URL", "info");
    }
  };

  // Real file upload from device using Supabase Storage
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const result = await uploadImage(file, "products");
        const publicUrl = result.url;

        if (isEdit && id) {
          // Persist immediately via backend
          const res = await adminApiService.uploadProductImages(id, [publicUrl]);
          if (res.success) {
            setImages(res.data.images);
          }
        } else {
          // Create mode: stage locally
          setImages((prev) => {
            const next = [
              ...prev,
              {
                id: "img-temp-" + Math.random().toString(36).substring(2, 9),
                url: publicUrl,
                altText: file.name,
                isPrimary: prev.length === 0,
                sortOrder: prev.length,
              },
            ];
            return next;
          });
        }
      }
      showToast(
        files.length > 1 ? "Images uploaded" : "Image uploaded",
        "success"
      );
    } catch (err: any) {
      showToast(err?.message || "Image upload failed", "error");
    } finally {
      setUploading(false);
      // reset input so same file can be re-selected
      e.target.value = "";
    }
  };

  const handleImageDelete = async (imgId: string) => {
    const target = images.find((img) => img.id === imgId);

    if (isEdit && id) {
      setSaving(true);
      const res = await adminApiService.deleteProductImage(id, imgId);
      setSaving(false);
      if (res.success) {
        // Try to clean up from Supabase Storage (safe if not ours)
        if (target?.url) {
          deleteStorageFile(target.url).catch(() => {});
        }
        showToast("Image removed", "success");
        setImages((prev) => prev.filter((img) => img.id !== imgId));
      } else {
        showToast(res.error.message || "Remove failed", "error");
      }
    } else {
      if (target?.url) {
        deleteStorageFile(target.url).catch(() => {});
      }
      setImages((prev) => prev.filter((img) => img.id !== imgId));
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const items = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);

    const remapped = items.map((img, idx) => ({
      ...img,
      sortOrder: idx,
      isPrimary: idx === 0,
    }));

    setImages(remapped);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    if (isEdit && id) {
      const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
      setSaving(true);
      await adminApiService.reorderProductImages(
        id,
        sorted.map((i) => i.id),
      );
      setSaving(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !categoryId || !priceRupees || !stock || !sku) {
      showToast("Please fill in all mandatory fields.", "error");
      return;
    }

    // Convert Rupees float to Paisa integer
    const pricePaisa = Math.round(parseFloat(priceRupees) * 100);
    const salePricePaisa = salePriceRupees
      ? Math.round(parseFloat(salePriceRupees) * 100)
      : null;
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
      showToast("Please upload or enter at least one product image.", "error");
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
      res = await adminApiService.updateProduct(id, payload as any);
    } else {
      res = await adminApiService.createProduct(payload as any);
    }
    setSaving(false);

    if (res.success) {
      const createdId = res.data?.id;

      // If we created a new product and have staged images (from device uploads or URLs),
      // persist them now that the product exists.
      if (!isEdit && createdId && images.length > 0) {
        for (const img of images) {
          if (img.url) {
            try {
              await adminApiService.uploadProductImages(createdId, [img.url]);
            } catch {
              // non-fatal
            }
          }
        }
      }

      showToast(
        isEdit ? "Design updated successfully" : "New design created",
        "success",
      );
      navigate("/admin/products");
    } else {
      showToast(res.error.message || "Submit operation failed", "error");
    }
  };

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  if (loading) {
    return <LoadingSpinner fullPage={true} />;
  }

  return (
    <div className="space-y-6 font-instrument text-left max-w-4xl mx-auto">
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
            {isEdit ? "Edit Design Product" : "Create New Design Product"}
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
                maxLength={500}
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
                  maxLength={100}
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
                  label="Sale Price (₹)"
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
                maxLength={500}
              />

              <Textarea
                label="Long description *"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Full detail description here..."
                maxLength={10000}
              />

              <div className="flex gap-6 py-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4.5 h-4.5 accent-primaryBg cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-secondary700">
                    Set as Featured design
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4.5 h-4.5 accent-primaryBg cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-secondary700">
                    Product is Active (Visible to users)
                  </span>
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
                  No custom specifications set. Add fields like Material,
                  Dimensions, Wood, Finish, or Size.
                </p>
              ) : (
                metadataRows.map((row, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <Input
                      placeholder="Spec Key (e.g. Material)"
                      value={row.key}
                      onChange={(e) =>
                        handleMetadataChange(idx, "key", e.target.value)
                      }
                      className="text-xs py-1.5"
                    />
                    <Input
                      placeholder="Spec Value (e.g. Teak wood)"
                      value={row.val}
                      onChange={(e) =>
                        handleMetadataChange(idx, "val", e.target.value)
                      }
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

          <Button
            type="submit"
            loading={saving || uploading}
            className="w-full py-3.5 text-sm"
            disabled={uploading}
          >
            {isEdit ? "Save Design Adjustments" : "Create New Design catalog"}
          </Button>
        </form>

        {/* Right column: Image gallery uploading and sorting */}
        <div className="space-y-6">
          <Card className="border border-secondary200 text-left">
            <CardHeader>
              <CardTitle>Image Attachments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload from device (Supabase Storage) + optional external URL */}
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-secondary600 mb-1.5 tracking-wide">Upload from Device</div>
                  <label className="block">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      disabled={uploading || saving}
                      className="hidden"
                    />
                    <div className="border border-dashed border-secondary300 hover:border-secondary400 rounded-xl px-4 py-3 text-center cursor-pointer text-xs flex flex-col items-center gap-1 text-secondary700 hover:bg-lightgrayColor transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="font-medium">{uploading ? "Uploading..." : "Click to select images (multiple supported)"}</span>
                      <span className="text-[10px] text-secondary500">JPG, PNG, WEBP up to 8MB</span>
                    </div>
                  </label>
                </div>

                {/* Optional: paste external URL */}
                <form onSubmit={handleImageUpload} className="space-y-2 pt-1">
                  <Input
                    label="Or paste external image URL"
                    placeholder="https://..."
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    className="text-xs"
                    disabled={uploading}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={!uploadUrl.trim() || uploading}
                    className="text-xs w-full"
                  >
                    Add External URL
                  </Button>
                </form>
              </div>

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
                          draggable={!saving && !uploading}
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center gap-3 p-2 bg-lightgrayColor border border-secondary200 rounded-xl justify-between transition-all duration-200 ${
                            draggedIndex === index
                              ? "opacity-40 border-dashed border-primary400 scale-[0.98]"
                              : "hover:border-secondary300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="cursor-grab active:cursor-grabbing p-1 text-secondary400 hover:text-secondary700"
                              title="Drag to reorder"
                            >
                              <GripVertical className="w-4 h-4 shrink-0" />
                            </div>
                            <div className="w-10 h-10 bg-white rounded overflow-hidden border border-secondary200 shrink-0">
                              <img
                                src={img.url}
                                alt="angle"
                                className="w-full h-full object-cover select-none pointer-events-none"
                              />
                            </div>
                            <span className="text-[10px] text-secondary600 font-medium select-none">
                              {index === 0
                                ? "Primary Cover"
                                : `Angle #${index}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleImageDelete(img.id)}
                              disabled={saving || uploading}
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
