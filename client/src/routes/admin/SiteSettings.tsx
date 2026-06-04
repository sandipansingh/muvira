import React, { useState, useEffect, useRef } from 'react';
import { settingsApiService } from '../../lib/api/settings';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { useToast } from '../../hooks/useToast';
import { uploadImage } from '../../lib/storage';
import type { HeroSlide } from '../../types/settings';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { Plus, Trash2, GripVertical, Upload } from 'lucide-react';

const emptySlide = (): HeroSlide => ({
  id: Date.now().toString(),
  title: '',
  subtitle: '',
  imageUrl: '',
  link: '',
});

export const SiteSettingsPage: React.FC = () => {
  const { settings, refresh } = useSiteSettings();
  const { showToast } = useToast();

  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');

  const [annEnabled, setAnnEnabled] = useState(true);
  const [annBadge, setAnnBadge] = useState('');
  const [annMessage, setAnnMessage] = useState('');

  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [storeDescription, setStoreDescription] = useState('');

  const [shippingCharge, setShippingCharge] = useState('0');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('0');

  const [savingContact, setSavingContact] = useState(false);
  const [savingAnn, setSavingAnn] = useState(false);
  const [savingSlides, setSavingSlides] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);

  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  useEffect(() => {
    if (!settings) return;
    setContactEmail(settings.contactInfo.email);
    setContactPhone(settings.contactInfo.phone);
    setContactAddress(settings.contactInfo.address);
    setAnnEnabled(settings.announcementBar.enabled);
    setAnnBadge(settings.announcementBar.badge);
    setAnnMessage(settings.announcementBar.message);
    setSlides(settings.heroSlides.length > 0 ? settings.heroSlides : [emptySlide()]);
    setStoreDescription(settings.storeDescription || '');
    if (settings.shippingRules) {
      setShippingCharge((settings.shippingRules.shippingChargePaisa / 100).toString());
      setFreeShippingThreshold((settings.shippingRules.freeShippingThresholdPaisa / 100).toString());
    }
  }, [settings]);

  const handleSaveContact = async () => {
    if (!contactEmail || !contactPhone || !contactAddress) {
      showToast('All contact fields are required.', 'error');
      return;
    }
    setSavingContact(true);
    const res = await settingsApiService.adminUpdateSettings({
      contact_info: { email: contactEmail, phone: contactPhone, address: contactAddress },
    });
    setSavingContact(false);
    if (res.success) {
      await refresh();
      showToast('Contact info saved.', 'success');
    } else {
      showToast(res.error.message || 'Failed to save.', 'error');
    }
  };

  const handleSaveDescription = async () => {
    if (!storeDescription) {
      showToast('Store description is required.', 'error');
      return;
    }
    setSavingDescription(true);
    const res = await settingsApiService.adminUpdateSettings({
      store_description: storeDescription,
    });
    setSavingDescription(false);
    if (res.success) {
      await refresh();
      showToast('Store description saved.', 'success');
    } else {
      showToast(res.error.message || 'Failed to save.', 'error');
    }
  };

  const handleSaveAnnouncement = async () => {
    if (annEnabled && !annMessage) {
      showToast('Announcement message is required when enabled.', 'error');
      return;
    }
    setSavingAnn(true);
    const res = await settingsApiService.adminUpdateSettings({
      announcement_bar: { enabled: annEnabled, badge: annBadge, message: annMessage },
    });
    setSavingAnn(false);
    if (res.success) {
      await refresh();
      showToast('Announcement bar saved.', 'success');
    } else {
      showToast(res.error.message || 'Failed to save.', 'error');
    }
  };

  const handleSaveShipping = async () => {
    const chargeVal = parseFloat(shippingCharge);
    const thresholdVal = parseFloat(freeShippingThreshold);

    if (isNaN(chargeVal) || chargeVal < 0 || isNaN(thresholdVal) || thresholdVal < 0) {
      showToast('Please enter valid numeric amounts for shipping rates.', 'error');
      return;
    }

    setSavingShipping(true);
    const res = await settingsApiService.adminUpdateSettings({
      shipping_rules: {
        shipping_charge_paisa: Math.round(chargeVal * 100),
        free_shipping_threshold_paisa: Math.round(thresholdVal * 100),
      },
    });
    setSavingShipping(false);

    if (res.success) {
      await refresh();
      showToast('Shipping rules saved.', 'success');
    } else {
      showToast(res.error.message || 'Failed to save shipping rules.', 'error');
    }
  };

  const handleSaveSlides = async () => {
    const invalid = slides.some((s) => !s.title || !s.imageUrl || !s.link);
    if (invalid) {
      showToast('Each slide must have a title, image URL, and link.', 'error');
      return;
    }
    if (slides.length === 0) {
      showToast('At least one hero slide is required.', 'error');
      return;
    }
    setSavingSlides(true);
    const res = await settingsApiService.adminUpdateSettings({ hero_slides: slides });
    setSavingSlides(false);
    if (res.success) {
      await refresh();
      showToast('Hero slides saved.', 'success');
    } else {
      showToast(res.error.message || 'Failed to save.', 'error');
    }
  };

  const updateSlide = (idx: number, field: keyof HeroSlide, value: string) => {
    setSlides((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const addSlide = () => setSlides((prev) => [...prev, emptySlide()]);

  const removeSlide = (idx: number) => {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIdx(idx);
    try {
      const result = await uploadImage(file, 'hero-slides');
      updateSlide(idx, 'imageUrl', result.url);
      showToast('Image uploaded.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploadingIdx(null);
      e.target.value = '';
    }
  };

  const handleDragStart = (idx: number) => {
    dragIdx.current = idx;
  };

  const handleDragEnter = (idx: number) => {
    dragOverIdx.current = idx;
    setSlides((prev) => {
      if (dragIdx.current === null || dragIdx.current === idx) return prev;
      const next = [...prev];
      const [moved] = next.splice(dragIdx.current, 1);
      next.splice(idx, 0, moved);
      dragIdx.current = idx;
      return next;
    });
  };

  const handleDragEnd = () => {
    dragIdx.current = null;
    dragOverIdx.current = null;
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)]">Site Settings</h1>
        <p className="text-sm text-secondary500 mt-1">Manage contact info, announcement bar, and hero slides.</p>
      </div>

      {/* ── Contact Info ── */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-base font-semibold text-[var(--text)]">Contact Information</h2>
          <div>
            <label className="block text-xs font-medium text-secondary600 mb-1">Email</label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="support@example.com"
              maxLength={255}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary600 mb-1">Phone</label>
            <Input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value.replace(/[^\d+()\s-]/g, '').slice(0, 50))}
              placeholder="+91 98765 43210"
              maxLength={50}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary600 mb-1">Address</label>
            <Textarea
              value={contactAddress}
              onChange={(e) => setContactAddress(e.target.value)}
              placeholder="Street, City, State, PIN"
              rows={2}
              maxLength={500}
            />
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSaveContact} disabled={savingContact}>
              {savingContact ? 'Saving…' : 'Save Contact Info'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Store Description ── */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-base font-semibold text-[var(--text)]">Store Description</h2>
          <div>
            <label className="block text-xs font-medium text-secondary600 mb-1">Footer/About Text</label>
            <Textarea
              value={storeDescription}
              onChange={(e) => setStoreDescription(e.target.value)}
              placeholder="Premium Indian lifestyle, apparel, and solid wood furniture designed to bring warmth and authentic craftsmanship into your home."
              rows={3}
              maxLength={1000}
            />
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSaveDescription} disabled={savingDescription}>
              {savingDescription ? 'Saving…' : 'Save Description'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Announcement Bar ── */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text)]">Announcement Bar</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-secondary600">Enabled</span>
              <input
                type="checkbox"
                checked={annEnabled}
                onChange={(e) => setAnnEnabled(e.target.checked)}
                className="w-4 h-4 accent-[var(--accent)]"
              />
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary600 mb-1">Badge Label</label>
            <Input
              value={annBadge}
              onChange={(e) => setAnnBadge(e.target.value)}
              placeholder="e.g. NEW DEALS"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary600 mb-1">Message</label>
            <Textarea
              value={annMessage}
              onChange={(e) => setAnnMessage(e.target.value)}
              placeholder="Diwali Festival Sale is active! Save 20% off with coupon DIWALI20"
              rows={2}
              maxLength={500}
            />
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSaveAnnouncement} disabled={savingAnn}>
              {savingAnn ? 'Saving…' : 'Save Announcement'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Shipping Configuration ── */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-base font-semibold text-[var(--text)]">Shipping Rules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-secondary600 mb-1">
                Flat Shipping Charge (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={shippingCharge}
                onChange={(e) => setShippingCharge(e.target.value)}
                placeholder="e.g. 150"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary600 mb-1">
                Free Shipping Threshold (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
                placeholder="e.g. 1000"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSaveShipping} disabled={savingShipping}>
              {savingShipping ? 'Saving…' : 'Save Shipping Rules'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Hero Slides ── */}
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--text)]">Hero Slides</h2>
              <p className="text-xs text-secondary500 mt-0.5">Drag the grip handle to reorder slides.</p>
            </div>
            <Button variant="outline" size="sm" onClick={addSlide}>
              <Plus className="w-4 h-4 mr-1" />
              Add Slide
            </Button>
          </div>

          <div className="space-y-4">
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="border border-[var(--border)] rounded-lg p-4 space-y-3 bg-white cursor-default"
              >
                {/* Slide header row */}
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-2 cursor-grab active:cursor-grabbing select-none"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4 text-secondary400" />
                    <span className="text-xs font-semibold text-secondary600 uppercase tracking-wide">
                      Slide {idx + 1}
                    </span>
                  </div>
                  {slides.length > 1 && (
                    <button
                      onClick={() => removeSlide(idx)}
                      className="text-rose-500 hover:text-rose-700 transition-colors"
                      aria-label="Remove slide"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-secondary600 mb-1">Title</label>
                  <Input
                    value={slide.title}
                    onChange={(e) => updateSlide(idx, 'title', e.target.value.slice(0, 200))}
                    placeholder="Festival Furniture Bonanza"
                    maxLength={200}
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="block text-xs font-medium text-secondary600 mb-1">Subtitle</label>
                  <Input
                    value={slide.subtitle}
                    onChange={(e) => updateSlide(idx, 'subtitle', e.target.value.slice(0, 500))}
                    placeholder="Up to 30% Off Sheesham Wood Craftsmanship"
                    maxLength={500}
                  />
                </div>

                {/* Image — URL input + device upload */}
                <div>
                  <label className="block text-xs font-medium text-secondary600 mb-1">Image</label>

                  {/* File upload zone */}
                  <label className="block cursor-pointer mb-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingIdx === idx}
                      onChange={(e) => handleFileUpload(e, idx)}
                    />
                    <div className="border border-dashed border-secondary300 hover:border-secondary400 rounded-lg px-3 py-2.5 flex items-center gap-2 text-xs text-secondary600 hover:bg-lightgrayColor transition-colors">
                      <Upload className="w-4 h-4 shrink-0" />
                      <span className="font-medium">
                        {uploadingIdx === idx ? 'Uploading…' : 'Upload from device'}
                      </span>
                      <span className="text-secondary400 ml-auto">JPG, PNG, WEBP · max 8MB</span>
                    </div>
                  </label>

                  {/* URL input */}
                  <Input
                    value={slide.imageUrl}
                    onChange={(e) => updateSlide(idx, 'imageUrl', e.target.value.slice(0, 2048))}
                    placeholder="Or paste image URL: https://…"
                    maxLength={2048}
                  />

                  {/* Preview */}
                  {slide.imageUrl && (
                    <img
                      src={slide.imageUrl}
                      alt={slide.title}
                      className="mt-2 h-28 w-full object-cover rounded-md border border-[var(--border)]"
                    />
                  )}
                </div>

                {/* Link */}
                <div>
                  <label className="block text-xs font-medium text-secondary600 mb-1">Link</label>
                  <Input
                    value={slide.link}
                    onChange={(e) => updateSlide(idx, 'link', e.target.value.slice(0, 2048))}
                    placeholder="/categories/solid-wood-furniture"
                    maxLength={2048}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSaveSlides} disabled={savingSlides}>
              {savingSlides ? 'Saving…' : 'Save Hero Slides'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteSettingsPage;
