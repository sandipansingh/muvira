import React from 'react'

export const AuthHeroCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <aside className={`auth-story ${className}`}>
    <img src="/images/editorial/stone-alcove.webp" alt="" width={1536} height={1024} />
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
