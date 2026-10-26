import React, { useState } from 'react'
import { settingsService } from '../../lib/services/settings.service'
import { uploadImage } from '../../lib/storage'
import type { HeroSlide, PromoBanner, SiteSettings } from '../../lib/types/settings'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { useToast } from '../../context/ToastContext'

type Content = HeroSlide | PromoBanner

function ContentImages({
  title,
  items,
  onChange,
  folder,
  maximum,
  minimum,
  disabled,
  onError,
  onUploading,
}: {
  title: string
  items: Content[]
  onChange: (items: Content[]) => void
  folder: 'hero-slides' | 'promo-banners'
  maximum: number
  minimum: number
  disabled: boolean
  onError: (message: string | null) => void
  onUploading: (uploading: boolean) => void
}) {
  const [uploading, setUploading] = useState(false)
  const update = (id: string, patch: Partial<Content>) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  return (
    <fieldset disabled={disabled || uploading} className="space-y-4">
      <legend className="heading text-lg">{title}s</legend>
      {items.map((item, index) => (
        <div key={item.id} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
          <label>
            {title} {index + 1} title
            <Input
              value={item.title}
              required
              maxLength={200}
              onChange={(event) => update(item.id, { title: event.target.value })}
            />
          </label>
          <label>
            {title} {index + 1} subtitle
            <Input
              value={item.subtitle}
              maxLength={500}
              onChange={(event) => update(item.id, { subtitle: event.target.value })}
            />
          </label>
          <label>
            {title} {index + 1} image URL
            <Input
              type="url"
              value={item.imageUrl}
              required
              onChange={(event) => update(item.id, { imageUrl: event.target.value })}
            />
          </label>
          <label>
            {title} {index + 1} link
            <Input
              value={item.link}
              required
              onChange={(event) => update(item.id, { link: event.target.value })}
            />
          </label>
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="h-32 w-full rounded-lg object-cover sm:col-span-2"
            />
          )}
          <label className="sm:col-span-2">
            Upload {title.toLowerCase()} {index + 1} image (up to 8 MiB)
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                setUploading(true)
                onUploading(true)
                onError(null)
                try {
                  const uploaded = await uploadImage(file, folder)
                  update(item.id, { imageUrl: uploaded.url })
                } catch (reason) {
                  onError(reason instanceof Error ? reason.message : 'Image upload failed.')
                } finally {
                  setUploading(false)
                  onUploading(false)
                }
              }}
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="button"
              className="button-secondary"
              disabled={index === 0}
              onClick={() => {
                const next = [...items]
                ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
                onChange(next)
              }}
            >
              Move {title.toLowerCase()} {index + 1} earlier
            </button>
            <button
              type="button"
              className="button-secondary"
              disabled={items.length <= minimum}
              onClick={() => onChange(items.filter((current) => current.id !== item.id))}
            >
              Remove {title.toLowerCase()} {index + 1}
            </button>
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="text-ink">No {title.toLowerCase()}s configured.</p>}
      <button
        type="button"
        className="button-secondary"
        disabled={items.length >= maximum}
        onClick={() =>
          onChange([
            ...items,
            { id: crypto.randomUUID(), title: '', subtitle: '', imageUrl: '', link: '/shop' },
          ])
        }
      >
        Add {title.toLowerCase()}
      </button>
      {uploading && (
        <p role="status" className="text-ink">
          Uploading image…
        </p>
      )}
    </fieldset>
  )
}

export function AdminContentEditor({
  settings,
  onSaved,
}: {
  settings: SiteSettings
  onSaved: (settings: SiteSettings) => void
}) {
  const [heroSlides, setHeroSlides] = useState(settings.heroSlides)
  const [promoBanners, setPromoBanners] = useState(settings.promoBanners)
  const [description, setDescription] = useState(settings.storeDescription)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || uploading) return
    setBusy(true)
    setError(null)
    try {
      const response = await settingsService.adminUpdateSettings({
        hero_slides: heroSlides,
        promo_banners: promoBanners,
        store_description: description,
      })
      if (!response.success) throw new Error(response.error.message)
      onSaved(response.data)
      showToast('Storefront content saved.', 'success')
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Content could not be saved. Uploaded images are preserved; retry saving your draft.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel space-y-4 p-5">
      <h3 className="heading text-xl">Storefront content</h3>
      <p className="text-ink">
        Save hero slides, promotional banners, and the store description together.
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft p-3 text-danger">
          {error}
        </p>
      )}
      <form onSubmit={save} className="space-y-6">
        <label className="block">
          Store description
          <Textarea
            aria-label="Store description"
            value={description}
            maxLength={1000}
            rows={5}
            disabled={busy || uploading}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <ContentImages
          title="Hero slide"
          items={heroSlides}
          onChange={setHeroSlides}
          folder="hero-slides"
          maximum={10}
          minimum={1}
          disabled={busy || uploading}
          onUploading={setUploading}
          onError={setError}
        />
        <ContentImages
          title="Promotional banner"
          items={promoBanners}
          onChange={setPromoBanners}
          folder="promo-banners"
          maximum={2}
          minimum={0}
          disabled={busy || uploading}
          onUploading={setUploading}
          onError={setError}
        />
        <button
          type="submit"
          disabled={busy || uploading || heroSlides.length === 0}
          className="button-primary"
        >
          {busy ? 'Saving…' : 'Save storefront content'}
        </button>
      </form>
    </section>
  )
}
