import React, { useState, useEffect, useRef } from 'react';
import { settingsApiService } from '../../lib/api/settings';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { useToast } from '../../hooks/useToast';
import { uploadImage } from '../../lib/storage';
import type { SiteSettings, HeroSlide } from '../../types/settings';
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

export const SiteSettings: React.FC = () => {
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

  const [savingContact, setSavingContact] = useState(false);
  const [savingAnn, setSavingAnn] = useState(false);
  const [savingSlides, setSavingSlides] = useState(false);

  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  useEffect(() => {
    setContactEmail(settings.contactInfo.email);
    setContactPhone(settings.contactInfo.phone);
    setContactAddress(settings.contactInfo.address);
    setAnnEnabled(settings.announcementBar.enabled);
    setAnnBadge(settings.announcementBar.badge);
    setAnnMessage(settings.announcementBar.message);
    setSlides(settings.heroSlides.length > 0 ? settings.heroSlides : [emptySlide()]);
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
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary600 mb-1">Phone</label>
            <Input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary600 mb-1">Address</label>
            <Textarea
              value={contactAddress}
              onChange={(e) => setContactAddress(e.target.value)}
              placeholder="Street, City, State, PIN"
              rows={2}
            />
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSaveContact} disabled={savingContact}>
              {savingContact ? 'Saving…' : 'Save Contact Info'}
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
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary600 mb-1">Message</label>
            <Textarea
              value={annMessage}
              onChange={(e) => setAnnMessage(e.target.value)}
              placeholder="Diwali Festival Sale is active! Save 20% off with coupon DIWALI20"
              rows={2}
            />
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSaveAnnouncement} disabled={savingAnn}>
              {savingAnn ? 'Saving…' : 'Save Announcement'}
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
                    onChange={(e) => updateSlide(idx, 'title', e.target.value)}
                    placeholder="Festival Furniture Bonanza"
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="block text-xs font-medium text-secondary600 mb-1">Subtitle</label>
                  <Input
                    value={slide.subtitle}
                    onChange={(e) => updateSlide(idx, 'subtitle', e.target.value)}
                    placeholder="Up to 30% Off Sheesham Wood Craftsmanship"
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
                    onChange={(e) => updateSlide(idx, 'imageUrl', e.target.value)}
                    placeholder="Or paste image URL: https://…"
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
                    onChange={(e) => updateSlide(idx, 'link', e.target.value)}
                    placeholder="/categories/solid-wood-furniture"
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

export default SiteSettings;
