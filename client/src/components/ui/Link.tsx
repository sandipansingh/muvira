import React, { forwardRef } from 'react'
import { Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router-dom'

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to?: string
  href?: string
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, href, className = '', children, ...props }, ref) => {
    const baseClasses =
      'text-ink hover:underline underline-offset-2 transition-colors cursor-pointer'

    if (to) {
      return (
        <RouterLink
          ref={ref}
          to={to}
          className={`${baseClasses} ${className}`}
          {...(props as unknown as Omit<RouterLinkProps, 'to'>)}
        >
          {children}
        </RouterLink>
      )
    }

    return (
      <a ref={ref} href={href} className={`${baseClasses} ${className}`} {...props}>
        {children}
      </a>
    )
  }
)

Link.displayName = 'Link'
