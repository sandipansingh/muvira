import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { adminApiService } from "../../lib/api/admin";
import type { InventoryItem } from "../../types/dashboard";
import { useToast } from "../../hooks/useToast";
import Card, { CardContent } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Pagination from "../../components/ui/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Dialog from "../../components/ui/Dialog";
import Skeleton from "../../components/ui/Skeleton";
import ErrorState from "../../components/shared/ErrorState";
import { Pencil, AlertTriangle } from "lucide-react";

export const InventoryList: React.FC = () => {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync inputs with URL params
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Filters
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Edit stock dialog states
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editStockValue, setEditStockValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [lowStockOnly, page]);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    const res = await adminApiService.getInventory(page, 20, lowStockOnly);
    if (res.success) {
      setInventory(res.data);
      setPagination(res.pagination);
    } else {
      setError(res.error.message || "Failed to fetch inventory reports.");
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
    setSearchParams(updated);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditId(item.productId);
    setEditName(item.productName);
    setEditSku(item.sku);
    setEditStockValue(item.stock.toString());
    setModalOpen(true);
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !editStockValue) return;

    setSaving(true);
    const newStock = parseInt(editStockValue, 10);
    const res = await adminApiService.updateProduct(editId, {
      stock: newStock,
    } as any);
    setSaving(false);

    if (res.success) {
      showToast(
        `Inventory updated for SKU "${editSku}" to ${newStock} units.`,
        "success",
      );
      setModalOpen(false);
      fetchInventory();
    } else {
      showToast(res.error.message || "Failed to update stock.", "error");
    }
  };

  return (
    <div className="space-y-6 font-instrument text-left">
      {/* Title */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-wide text-darkColor">
          Inventory Control Center
        </h2>
        <p className="text-xs text-secondary500 tracking-wide mt-1">
          Monitor catalog stock counts, audit SKUs, and apply quick-adjustments
          to items.
        </p>
      </div>

      {/* Filters Checkbox */}
      <Card className="border border-secondary200">
        <CardContent className="p-4 flex items-center">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => {
                setLowStockOnly(e.target.checked);
                updateParam('page', '1');
              }}
              className="w-4.5 h-4.5 accent-amber-500 rounded text-amber-500 cursor-pointer"
            />
            <span className="text-xs font-semibold text-secondary700 flex items-center gap-1.5 hover:text-darkColor transition-colors">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Show Low Stock Warnings Only (Stock ≤ 5 units)
            </span>
          </label>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card className="border border-secondary200 shadow-sm">
        <CardContent className="p-0">
          {error ? (
            <ErrorState message={error} onRetry={fetchInventory} />
          ) : loading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-10 text-xs md:text-sm text-secondary500">
              No inventory warnings found. All stocks are optimal.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Design Product Name</TableHead>
                  <TableHead>SKU ID Code</TableHead>
                  <TableHead>Current Stock Level</TableHead>
                  <TableHead>Status level</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium text-darkColor">
                      {item.productName}
                    </TableCell>
                    <TableCell className="text-xs font-normal text-secondary500 font-instrument uppercase tracking-wider">
                      {item.sku}
                    </TableCell>
                    <TableCell className="font-medium text-secondary700 font-instrument">
                      {item.stock} units
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.isLowStock ? "warning" : "success"}>
                        {item.stock === 0
                          ? "Out of Stock"
                          : item.isLowStock
                            ? "Low Stock"
                            : "Optimal"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="text-secondary500 hover:text-darkColor transition-colors p-1.5 inline-flex items-center"
                        title="Adjust Stock"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
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

      {/* QUICK EDIT DIALOG */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Adjust Stock Count"
        maxWidth="sm"
      >
        <form
          onSubmit={handleSaveStock}
          className="space-y-4 font-instrument text-left"
        >
          <div className="bg-lightgrayColor p-4 rounded-xl border border-secondary200 space-y-1">
            <span className="text-[10px] font-bold text-secondary500 uppercase tracking-widest leading-none block">
              Design Title
            </span>
            <p className="text-sm font-bold text-darkColor">{editName}</p>
            <p className="text-[10px] text-secondary500 font-instrument uppercase tracking-wider mt-0.5 leading-none">
              SKU: {editSku}
            </p>
          </div>

          <Input
            label="Adjust Available Units *"
            type="number"
            value={editStockValue}
            onChange={(e) => setEditStockValue(e.target.value)}
            placeholder="E.g. 15"
            required
          />

          <Button type="submit" loading={saving} className="w-full py-2.5">
            Save Inventory Adjustment
          </Button>
        </form>
      </Dialog>
    </div>
  );
};

export default InventoryList;
