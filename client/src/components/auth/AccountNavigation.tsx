import { MapPin, Package, User } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

export function AccountNavigation({
  addressCount,
  sidebar = false,
}: {
  addressCount?: number
  sidebar?: boolean
}) {
  return (
    <nav
      className={`account-navigation ${sidebar ? 'account-navigation--sidebar' : ''}`}
      aria-label="Your account"
    >
      <NavLink
        to="/profile"
        end
        className={({ isActive }) =>
          isActive ? 'account-navigation__link is-active' : 'account-navigation__link'
        }
      >
        <User className="h-4 w-4 shrink-0" />
        Personal info
      </NavLink>
      <NavLink
        to="/orders"
        className={({ isActive }) =>
          isActive ? 'account-navigation__link is-active' : 'account-navigation__link'
        }
      >
        <Package className="h-4 w-4 shrink-0" />
        My orders
      </NavLink>
      <Link to="/profile#addresses" className="account-navigation__link">
        <MapPin className="h-4 w-4 shrink-0" />
        Saved addresses{addressCount !== undefined ? ` (${addressCount})` : ''}
      </Link>
    </nav>
  )
}
