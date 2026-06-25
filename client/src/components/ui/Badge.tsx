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
  const variants = {
    primary: 'bg-primary100 text-primaryBg border-primary200/50',
    secondary: 'bg-lightgrayColor text-secondary700 border-secondary200',
    success: 'bg-green-50 text-green-700 border-green-200/60',
    danger: 'bg-red-50 text-red-700 border-red-200/60',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
    neutral: 'bg-stone-100 text-stone-600 border-stone-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
