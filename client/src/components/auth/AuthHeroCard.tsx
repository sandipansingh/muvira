import React from 'react'
import { CollectionScene } from '../common/CollectionScene'

export const AuthHeroCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <aside className={`auth-story ${className}`}>
    <CollectionScene />
    <div>
      <span className="eyebrow">Welcome to Muvira</span>
      <h2>
        Make room for
        <br />
        everyday devotion.
      </h2>
      <p>Your collection, your orders, and the little things that make a space your own.</p>
    </div>
  </aside>
)
export default AuthHeroCard
