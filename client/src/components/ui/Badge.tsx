import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
  ...props
}) => {
  const textColors = {
    primary: 'text-secondary800',
    secondary: 'text-secondary600',
    success: 'text-secondary600',
    danger: 'text-secondary600',
    warning: 'text-secondary600',
    neutral: 'text-secondary500',
  };

  return (
    <span
      className={`inline-flex items-center text-[10px] font-medium uppercase tracking-wider ${textColors[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
