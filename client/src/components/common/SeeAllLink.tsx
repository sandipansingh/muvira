import React from 'react'
import { Link } from 'react-router-dom'

interface SeeAllLinkProps {
  href: string
  label: string
  className?: string
}

export const SeeAllLink: React.FC<SeeAllLinkProps> = ({ href, label, className = '' }) => {
  return (
    <Link
      to={href}
      className={`text-neutral-900 font-bold underline hover:text-brand transition-colors duration-200 text-sm shrink-0 ${className}`}
    >
      {label}
    </Link>
  )
}

export default SeeAllLink
