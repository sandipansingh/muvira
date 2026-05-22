import React, { useState, useEffect } from 'react';
import { adminApiService } from '../../lib/api/admin';
import type { Coupon } from '../../types/coupon';
import { useToast } from '../../hooks/useToast';
import { formatPrice, formatDate } from '../../lib/format';
import Card, { CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Dialog from '../../components/ui/Dialog';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/shared/ErrorState';
import { Plus, Ban } from 'lucide-react';

export const CouponsList: React.FC = () => {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [usageLimit, setUsageLimit] = useState('100');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    setError(null);
    const res = await adminApiService.getCoupons();
    if (res.success) {
      setCoupons(res.data);
    } else {
      setError(res.error.message || 'Failed to load coupons list.');
    }
    setLoading(false);
  };

  const handleOpenAdd = () => {
    setCode('');
    setDiscountType('percentage');
    setDiscountValue('');
    setMinOrderAmount('0');
    setMaxDiscountAmount('0');
    setUsageLimit('100');
    // Default dates: today and one month from today in local datetime format
    const today = new Date();
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    setValidFrom(today.toISOString().substring(0, 16));
    setValidUntil(nextMonth.toISOString().substring(0, 16));
    
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discountValue || !validFrom || !validUntil) {
      showToast('Please fill in all mandatory fields.', 'error');
      return;
    }

    setSaving(true);
    // Convert inputs: Rupees -> Paisa
    const valAmount = discountType === 'fixed'
      ? Math.round(parseFloat(discountValue) * 100)
      : parseInt(discountValue, 10);

    const minAmount = minOrderAmount ? Math.round(parseFloat(minOrderAmount) * 100) : 0;
    const maxAmount = maxDiscountAmount ? Math.round(parseFloat(maxDiscountAmount) * 100) : 0;

    const res = await adminApiService.createCoupon({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: valAmount,
      minOrderAmount: minAmount,
      maxDiscountAmount: maxAmount,
      usageLimit: parseInt(usageLimit, 10),
      validFrom: new Date(validFrom).toISOString(),
      validUntil: new Date(validUntil).toISOString(),
    });
    setSaving(false);

    if (res.success) {
      showToast(`Coupon "${code.toUpperCase()}" created successfully.`, 'success');
      setModalOpen(false);
      fetchCoupons();
    } else {
      showToast(res.error.message || 'Failed to create coupon.', 'error');
    }
  };

  const handleDeactivate = async (id: string, codeStr: string) => {
    if (!confirm(`Are you sure you want to deactivate coupon "${codeStr}"?`)) return;

    setSaving(true);
    const res = await adminApiService.deactivateCoupon(id);
    setSaving(false);

    if (res.success) {
      showToast(`Coupon "${codeStr}" deactivated.`, 'success');
      fetchCoupons();
    } else {
      showToast(res.error.message || 'Deactivation failed.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-redhat text-left">
      {/* Title */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-wide text-darkColor">
            Coupon Management
          </h2>
          <p className="text-xs text-secondary500 tracking-wide mt-1">
            Create discount coupon campaigns, usage criteria, and active statuses.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleOpenAdd}
          className="text-xs md:text-sm py-2 px-4 flex items-center gap-1 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Coupon
        </Button>
      </div>

      {/* TABLE */}
      <Card className="border border-secondary200 shadow-sm">
        <CardContent className="p-0">
          {error ? (
            <ErrorState message={error} onRetry={fetchCoupons} />
          ) : loading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-10 text-xs md:text-sm text-secondary500">
              No coupons found in database.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coupon Code</TableHead>
                  <TableHead>Discount Value</TableHead>
                  <TableHead>Criteria (Min Order)</TableHead>
                  <TableHead>Max Cap</TableHead>
                  <TableHead>Usage Limit</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => {
                  const valDisplay = c.discountType === 'percentage'
                    ? `${c.discountValue}%`
                    : formatPrice(c.discountValue);

                  const now = new Date();
                  const until = new Date(c.validUntil);
                  const isExpired = now > until;

                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-darkColor font-roboto tracking-wider uppercase">
                        {c.code}
                      </TableCell>
                      <TableCell className="font-medium text-secondary700">
                        {valDisplay}
                      </TableCell>
                      <TableCell className="text-xs font-normal text-secondary600 font-roboto">
                        {c.minOrderAmount > 0 ? formatPrice(c.minOrderAmount) : '₹0 (No Min)'}
                      </TableCell>
                      <TableCell className="text-xs font-normal text-secondary600 font-roboto">
                        {c.maxDiscountAmount > 0 ? formatPrice(c.maxDiscountAmount) : 'No Cap'}
                      </TableCell>
                      <TableCell className="text-xs font-normal text-secondary600 font-roboto">
                        {c.usageLimit} times
                      </TableCell>
                      <TableCell className="text-[10px] font-medium text-secondary600 leading-snug">
                        <p>From: {formatDate(c.validFrom)}</p>
                        <p className={isExpired ? 'text-secondary500 font-medium' : ''}>
                          Until: {formatDate(c.validUntil)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.isActive && !isExpired ? 'success' : 'neutral'}>
                          {isExpired ? 'Expired' : c.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {c.isActive && !isExpired ? (
                          <button
                            onClick={() => handleDeactivate(c.id, c.code)}
                            className="text-secondary500 hover:text-rose-600 transition-colors p-1"
                            title="Deactivate"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-medium text-secondary400 uppercase mr-3">
                            Locked
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* DIALOG FOR CREATE */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Promo Coupon Code"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Promo Coupon Code *"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="E.g. DIWALI30"
            className="uppercase"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Discount Type *"
              options={[
                { value: 'percentage', label: 'Percentage (%)' },
                { value: 'fixed', label: 'Fixed Rupees (₹)' },
              ]}
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as any)}
            />
            <Input
              label={discountType === 'percentage' ? 'Percentage Value *' : 'Rupees Amount (₹) *'}
              type="number"
              step="0.01"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percentage' ? '20' : '150.00'}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Order Amount (₹)"
              type="number"
              step="0.01"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              placeholder="500.00"
            />
            <Input
              label="Max Discount Cap (₹)"
              type="number"
              step="0.01"
              value={maxDiscountAmount}
              onChange={(e) => setMaxDiscountAmount(e.target.value)}
              placeholder="1000.00"
              disabled={discountType === 'fixed'}
              className={discountType === 'fixed' ? 'bg-lightgrayColor opacity-50' : ''}
            />
          </div>

          <Input
            label="Total Usage Count Limit *"
            type="number"
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder="500"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valid From *"
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              required
            />
            <Input
              label="Valid Until *"
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              required
            />
          </div>

          <Button type="submit" loading={saving} className="w-full py-2.5">
            Create Promo Coupon
          </Button>
        </form>
      </Dialog>
    </div>
  );
};

export default CouponsList;
