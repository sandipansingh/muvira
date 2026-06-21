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
  const baseStyle = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider';

  const variants = {
    primary: 'bg-primary100 text-primaryBg border border-primary200',
    secondary: 'bg-secondary200 text-secondary700',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    danger: 'bg-rose-100 text-rose-800 border border-rose-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
    neutral: 'bg-gray-100 text-gray-800 border border-gray-200',
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};

export default Badge;
