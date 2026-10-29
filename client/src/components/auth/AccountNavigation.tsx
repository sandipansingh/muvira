import { MapPin, Package, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

export function AccountNavigation({ addressCount }: { addressCount?: number }) {
  const { pathname, hash, search } = useLocation()
  const active = pathname.startsWith('/orders')
    ? 'orders'
    : hash === '#addresses'
      ? 'addresses'
      : hash === '#personal-info'
        ? 'personal'
        : 'orders'
  const profileHref = `/profile${search}`
  const destinations = [
    { id: 'orders', href: profileHref, label: 'My orders', icon: Package },
    {
      id: 'addresses',
      href: `${profileHref}#addresses`,
      label: `Saved addresses${addressCount !== undefined ? ` (${addressCount})` : ''}`,
      icon: MapPin,
    },
    { id: 'personal', href: `${profileHref}#personal-info`, label: 'Personal info', icon: User },
  ]
  return (
    <nav className="account-navigation" aria-label="Your account">
      {destinations.map(({ id, href, label, icon: Icon }) => (
        <Link
          key={id}
          to={href}
          aria-current={active === id ? 'page' : undefined}
          className={`account-navigation__link${active === id ? ' is-active' : ''}`}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
