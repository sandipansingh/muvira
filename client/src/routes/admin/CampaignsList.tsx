import React, { useState, useEffect } from 'react';
import { adminApiService } from '../../lib/api/admin';
import type { Campaign } from '../../types/campaign';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../lib/format';
import Card, { CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Dialog from '../../components/ui/Dialog';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/shared/ErrorState';
import { Plus, Pencil, ToggleLeft, ToggleRight, Upload } from 'lucide-react';
import { uploadImage } from '../../lib/storage';

export const CampaignsList: React.FC = () => {
  const { showToast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    const res = await adminApiService.getCampaigns();
    if (res.success) {
      setCampaigns(res.data);
    } else {
      setError(res.error.message || 'Failed to load campaigns list.');
    }
    setLoading(false);
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setName('');
    setDescription('');
    setBannerImageUrl('');
    setDiscountType('percentage');
    setDiscountValue('');
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    setStartDate(today.toISOString().substring(0, 16));
    setEndDate(nextWeek.toISOString().substring(0, 16));
    setIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (camp: Campaign) => {
    setEditId(camp.id);
    setName(camp.name);
    setDescription(camp.description);
    setBannerImageUrl(camp.bannerImageUrl);
    setDiscountType(camp.discountType);
    setDiscountValue(
      camp.discountType === 'fixed'
        ? (camp.discountValue / 100).toString()
        : camp.discountValue.toString()
    );
    setStartDate(new Date(camp.startDate).toISOString().substring(0, 16));
    setEndDate(new Date(camp.endDate).toISOString().substring(0, 16));
    setIsActive(camp.isActive);
    setModalOpen(true);
  };

  // Upload campaign banner from device via Supabase Storage
  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadImage(file, 'campaigns');
      setBannerImageUrl(result.url);
      showToast('Banner uploaded', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !bannerImageUrl || !discountValue || !startDate || !endDate) {
      showToast('Please fill in all mandatory fields.', 'error');
      return;
    }

    setSaving(true);
    // Convert float value if fixed Rupees -> Paisa
    const valAmount = discountType === 'fixed'
      ? Math.round(parseFloat(discountValue) * 100)
      : parseInt(discountValue, 10);

    const payload = {
      name,
      description,
      bannerImageUrl,
      discountType,
      discountValue: valAmount,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      isActive,
    };

    let res;
    if (editId) {
      res = await adminApiService.updateCampaign(editId, payload);
    } else {
      res = await adminApiService.createCampaign(payload);
    }
    setSaving(false);

    if (res.success) {
      showToast(editId ? 'Campaign updated' : 'Campaign created', 'success');
      setModalOpen(false);
      fetchCampaigns();
    } else {
      showToast(res.error.message || 'Failed to save campaign.', 'error');
    }
  };

  const handleToggle = async (id: string, nameStr: string) => {
    setSaving(true);
    const res = await adminApiService.toggleCampaign(id);
    setSaving(false);

    if (res.success) {
      showToast(`Campaign "${nameStr}" active status toggled.`, 'success');
      fetchCampaigns();
    } else {
      showToast(res.error.message || 'Operation failed.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-redhat text-left">
      {/* Title */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-wide text-darkColor">
            Campaign & Sale Banner Management
          </h2>
          <p className="text-xs text-secondary500 tracking-wide mt-1">
            Configure promotional marketing banners, active sale windows, and discount rates.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleOpenAdd}
          className="text-xs md:text-sm py-2 px-4 flex items-center gap-1 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Campaign
        </Button>
      </div>

      {/* TABLE */}
      <Card className="border border-secondary200 shadow-sm">
        <CardContent className="p-0">
          {error ? (
            <ErrorState message={error} onRetry={fetchCampaigns} />
          ) : loading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-10 text-xs md:text-sm text-secondary500">
              No campaigns found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banner Image</TableHead>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Discount Value</TableHead>
                  <TableHead>Active Window</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((camp) => {
                  const valDisplay = camp.discountType === 'percentage'
                    ? `${camp.discountValue}%`
                    : `${camp.discountValue / 100} Rupees`;

                  const now = new Date();
                  const start = new Date(camp.startDate);
                  const end = new Date(camp.endDate);
                  const isWindowActive = now >= start && now <= end;

                  return (
                    <TableRow key={camp.id}>
                      <TableCell>
                        <div className="w-16 h-10 bg-lightgrayColor border border-secondary200 rounded overflow-hidden shrink-0">
                          <img src={camp.bannerImageUrl} alt={camp.name} className="w-full h-full object-cover" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-darkColor leading-none">{camp.name}</p>
                        <p className="text-[10px] text-secondary500 truncate max-w-[200px] mt-1.5 leading-snug">
                          {camp.description}
                        </p>
                      </TableCell>
                      <TableCell className="font-medium text-secondary700">
                        {valDisplay}
                      </TableCell>
                      <TableCell className="text-[10px] font-medium text-secondary600 leading-snug">
                        <p>Start: {formatDate(camp.startDate)}</p>
                        <p>End: {formatDate(camp.endDate)}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={camp.isActive && isWindowActive ? 'success' : 'neutral'}>
                          {camp.isActive && isWindowActive ? 'Active' : !camp.isActive ? 'Deactivated' : 'Scheduled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleToggle(camp.id, camp.name)}
                            className="text-secondary500 hover:text-darkColor p-1 transition-colors focus:outline-none"
                            title={camp.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {camp.isActive ? (
                              <ToggleRight className="w-5.5 h-5.5 text-secondary700" />
                            ) : (
                              <ToggleLeft className="w-5.5 h-5.5 text-secondary300" />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(camp)}
                            className="text-secondary500 hover:text-darkColor p-1 transition-colors focus:outline-none"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
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

      {/* DIALOG FOR CREATE/EDIT */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Campaign' : 'Create Campaign Event'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Campaign Sale Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="E.g. Diwali Festival Bonanza"
            required
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-secondary700">Banner Image *</label>
              <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border border-secondary300 hover:bg-lightgrayColor text-secondary700">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerImageUpload}
                  disabled={uploading || saving}
                  className="hidden"
                />
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Uploading...' : 'Upload from device'}
              </label>
            </div>
            <Input
              value={bannerImageUrl}
              onChange={(e) => setBannerImageUrl(e.target.value)}
              placeholder="https://... (or upload above)"
              required
            />
            {bannerImageUrl && (
              <div className="w-full h-20 mt-1 rounded border border-secondary200 overflow-hidden bg-lightgrayColor">
                <img src={bannerImageUrl} alt="banner preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

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
              placeholder={discountType === 'percentage' ? '30' : '200.00'}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date *"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="End Date *"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <Textarea
            label="Campaign Description *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Marketing tagline for banners..."
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
            <span className="text-xs font-semibold text-secondary600">Campaign is Active</span>
          </label>

          <Button type="submit" loading={saving || uploading} disabled={uploading} className="w-full py-2.5">
            {editId ? 'Save Adjustments' : 'Create Campaign'}
          </Button>
        </form>
      </Dialog>
    </div>
  );
};

export default CampaignsList;
