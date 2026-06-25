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
import { Plus, Trash2, GripVertical, Upload, Mail, Phone, MapPin, Truck, Megaphone, Layers, Info } from 'lucide-react';

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

  const [activeTab, setActiveTab] = useState<'general' | 'announcements' | 'slides'>('general');

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
    <div className="w-full space-y-6 text-left pb-10">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-darkColor tracking-wide">Site Settings</h1>
        <p className="text-xs text-secondary500 mt-1">Manage contact info, announcement bar, and hero slides.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-secondary200">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs md:text-sm font-semibold tracking-wider uppercase transition-all duration-200 ${
            activeTab === 'general'
              ? 'border-primaryBg text-primaryBg font-bold'
              : 'border-transparent text-secondary500 hover:text-darkColor'
          }`}
        >
          <Info className="w-4 h-4" />
          General Store Info
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs md:text-sm font-semibold tracking-wider uppercase transition-all duration-200 ${
            activeTab === 'announcements'
              ? 'border-primaryBg text-primaryBg font-bold'
              : 'border-transparent text-secondary500 hover:text-darkColor'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Fulfillment & Banners
        </button>
        <button
          onClick={() => setActiveTab('slides')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs md:text-sm font-semibold tracking-wider uppercase transition-all duration-200 ${
            activeTab === 'slides'
              ? 'border-primaryBg text-primaryBg font-bold'
              : 'border-transparent text-secondary500 hover:text-darkColor'
          }`}
        >
          <Layers className="w-4 h-4" />
          Hero Slides
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Contact Info Card */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <h2 className="text-sm font-bold text-darkColor uppercase tracking-wider flex items-center gap-2 border-b border-secondary200 pb-3">
                  <Phone className="w-4.5 h-4.5 text-primaryBg" />
                  Contact Information
                </h2>
                <div>
                  <label className="block text-xs font-semibold text-secondary700 mb-1 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="support@example.com"
                      maxLength={255}
                      className="pl-10"
                    />
                    <Mail className="w-4.5 h-4.5 text-secondary400 absolute left-3 top-3" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary700 mb-1 uppercase tracking-wider">Phone</label>
                  <div className="relative">
                    <Input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value.replace(/[^\d+()\s-]/g, '').slice(0, 50))}
                      placeholder="+91 98765 43210"
                      maxLength={50}
                      className="pl-10"
                    />
                    <Phone className="w-4.5 h-4.5 text-secondary400 absolute left-3 top-3" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary700 mb-1 uppercase tracking-wider">Address</label>
                  <div className="relative">
                    <Textarea
                      value={contactAddress}
                      onChange={(e) => setContactAddress(e.target.value)}
                      placeholder="Street, City, State, PIN"
                      rows={3}
                      maxLength={500}
                      className="pl-10 pt-2"
                    />
                    <MapPin className="w-4.5 h-4.5 text-secondary400 absolute left-3 top-3.5" />
                  </div>
                </div>
                <div className="flex justify-end pt-2 border-t border-secondary200/50">
                  <Button variant="primary" size="sm" onClick={handleSaveContact} disabled={savingContact}>
                    {savingContact ? 'Saving…' : 'Save Contact Info'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Store Description Card */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <h2 className="text-sm font-bold text-darkColor uppercase tracking-wider flex items-center gap-2 border-b border-secondary200 pb-3">
                  <Info className="w-4.5 h-4.5 text-primaryBg" />
                  About The Store
                </h2>
                <div>
                  <label className="block text-xs font-semibold text-secondary700 mb-1 uppercase tracking-wider">Footer / About Description</label>
                  <Textarea
                    value={storeDescription}
                    onChange={(e) => setStoreDescription(e.target.value)}
                    placeholder="Premium Indian lifestyle, apparel..."
                    rows={4}
                    maxLength={1000}
                  />
                </div>
                <div className="flex justify-end pt-2 border-t border-secondary200/50">
                  <Button variant="primary" size="sm" onClick={handleSaveDescription} disabled={savingDescription}>
                    {savingDescription ? 'Saving…' : 'Save Description'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Announcement Card */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between border-b border-secondary200 pb-3">
                  <h2 className="text-sm font-bold text-darkColor uppercase tracking-wider flex items-center gap-2">
                    <Megaphone className="w-4.5 h-4.5 text-primaryBg" />
                    Announcement Banner
                  </h2>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={annEnabled}
                      onChange={(e) => setAnnEnabled(e.target.checked)}
                      className="w-4 h-4 accent-primaryBg cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-secondary700">Active</span>
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary700 mb-1 uppercase tracking-wider">Badge Text</label>
                  <Input
                    value={annBadge}
                    onChange={(e) => setAnnBadge(e.target.value)}
                    placeholder="e.g. FESTIVE DEALS"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary700 mb-1 uppercase tracking-wider">Campaign Message</label>
                  <Textarea
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    placeholder="Diwali Sale is active! Save 20%..."
                    rows={4}
                    maxLength={500}
                  />
                </div>
                <div className="flex justify-end pt-2 border-t border-secondary200/50">
                  <Button variant="primary" size="sm" onClick={handleSaveAnnouncement} disabled={savingAnn}>
                    {savingAnn ? 'Saving…' : 'Save Announcement'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Config Card */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <h2 className="text-sm font-bold text-darkColor uppercase tracking-wider flex items-center gap-2 border-b border-secondary200 pb-3">
                  <Truck className="w-4.5 h-4.5 text-primaryBg" />
                  Shipping & Delivery Rules
                </h2>
                <div>
                  <label className="block text-xs font-semibold text-secondary700 mb-1 uppercase tracking-wider">
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
                  <label className="block text-xs font-semibold text-secondary700 mb-1 uppercase tracking-wider">
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
                <div className="flex justify-end pt-2 border-t border-secondary200/50">
                  <Button variant="primary" size="sm" onClick={handleSaveShipping} disabled={savingShipping}>
                    {savingShipping ? 'Saving…' : 'Save Shipping Rules'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'slides' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="flex items-center justify-between border-b border-secondary200 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-darkColor uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4.5 h-4.5 text-primaryBg" />
                      Hero Carousel Manager
                    </h2>
                    <p className="text-[10px] text-secondary500 mt-0.5">Drag any card handle to arrange slides order.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addSlide} className="flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    Add New Slide
                  </Button>
                </div>

                {/* HORIZONTAL CAROUSEL LAYOUT FOR DRAG REORDERING */}
                <div className="flex flex-row overflow-x-auto gap-4 pb-4 pt-1 snap-x no-scrollbar select-none">
                  {slides.map((slide, idx) => (
                    <div
                      key={slide.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragEnter={() => handleDragEnter(idx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      className="w-80 shrink-0 border border-secondary200 rounded-xl p-4 space-y-3 bg-white shadow-sm hover:border-secondary300 transition-all select-none snap-start relative"
                    >
                      {/* Grip Header Row */}
                      <div className="flex items-center justify-between border-b border-secondary100 pb-2">
                        <div
                          className="flex items-center gap-2 cursor-grab active:cursor-grabbing text-secondary500 hover:text-darkColor"
                          title="Drag slide horizontally to reorder"
                        >
                          <GripVertical className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            Slide #{idx + 1}
                          </span>
                        </div>
                        {slides.length > 1 && (
                          <button
                            onClick={() => removeSlide(idx)}
                            className="text-rose-500 hover:text-rose-700 transition-colors p-1"
                            aria-label="Remove slide"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Form Details */}
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <label className="block text-[10px] font-semibold text-secondary700 mb-0.5 uppercase tracking-wider">Title</label>
                          <Input
                            value={slide.title}
                            onChange={(e) => updateSlide(idx, 'title', e.target.value.slice(0, 200))}
                            placeholder="Festival Furniture Sale"
                            maxLength={200}
                            className="text-xs !py-1"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-secondary700 mb-0.5 uppercase tracking-wider">Subtitle</label>
                          <Input
                            value={slide.subtitle}
                            onChange={(e) => updateSlide(idx, 'subtitle', e.target.value.slice(0, 500))}
                            placeholder="Up to 30% Off Sheesham Wood"
                            maxLength={500}
                            className="text-xs !py-1"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-secondary700 mb-0.5 uppercase tracking-wider">Image Preview</label>
                          
                          {/* File Device Picker */}
                          <label className="block cursor-pointer mb-1.5">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingIdx === idx}
                              onChange={(e) => handleFileUpload(e, idx)}
                            />
                            <div className="border border-dashed border-secondary300 hover:border-secondary400 rounded-lg px-2.5 py-1.5 flex items-center justify-center gap-1.5 text-[10px] text-secondary600 hover:bg-lightgrayColor transition-colors">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{uploadingIdx === idx ? 'Uploading…' : 'Upload device image'}</span>
                            </div>
                          </label>

                          <Input
                            value={slide.imageUrl}
                            onChange={(e) => updateSlide(idx, 'imageUrl', e.target.value.slice(0, 2048))}
                            placeholder="Or paste image URL"
                            maxLength={2048}
                            className="text-xs !py-1"
                          />

                          {/* Render visual image thumbnail */}
                          {slide.imageUrl && (
                            <div className="mt-2 h-20 w-full overflow-hidden rounded-lg border border-secondary200 bg-lightgrayColor">
                              <img
                                src={slide.imageUrl}
                                alt={slide.title}
                                className="w-full h-full object-cover select-none pointer-events-none"
                              />
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-secondary700 mb-0.5 uppercase tracking-wider">Navigation Link</label>
                          <Input
                            value={slide.link}
                            onChange={(e) => updateSlide(idx, 'link', e.target.value.slice(0, 2048))}
                            placeholder="/categories/wood-furniture"
                            maxLength={2048}
                            className="text-xs !py-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-3 border-t border-secondary200">
                  <Button variant="primary" size="sm" onClick={handleSaveSlides} disabled={savingSlides}>
                    {savingSlides ? 'Saving…' : 'Save Hero Slides'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteSettingsPage;
