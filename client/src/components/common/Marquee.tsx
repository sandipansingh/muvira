import React from 'react'
import { cn } from '../../lib/utils/cn'

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  reverse?: boolean
  pauseOnHover?: boolean
  children?: React.ReactNode
  vertical?: boolean
  repeat?: number
}

export const Marquee: React.FC<MarqueeProps> = ({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  style,
  ...props
}) => {
  return (
    <div
      {...props}
      style={
        {
          ...style,
          gap: 'var(--gap, 1.5rem)',
        } as React.CSSProperties
      }
      className={cn(
        'group flex overflow-hidden p-2',
        vertical ? 'flex-col' : 'flex-row',
        pauseOnHover && 'pause-on-hover',
        className
      )}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          style={
            {
              gap: 'var(--gap, 1.5rem)',
              animationDirection: reverse ? 'reverse' : undefined,
            } as React.CSSProperties
          }
          className={cn(
            'flex shrink-0 justify-around',
            vertical ? 'animate-marquee-vertical flex-col' : 'animate-marquee flex-row'
          )}
        >
          {children}
        </div>
      ))}
    </div>
  )
}

export default Marquee
