import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  pill?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  pill = true,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-medium tracking-[0.4px] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 disabled:opacity-50 disabled:pointer-events-none';

  const variants = {
    primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] active:bg-[#8e3c1f] border border-transparent',
    secondary: 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)] active:bg-[#e1d9cd] border border-transparent',
    outline: 'bg-transparent text-[var(--accent)] border border-[var(--accent)] hover:bg-[#f9f0e8] active:bg-[var(--accent)]/10',
    ghost: 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-2)] active:bg-[var(--border)] border border-transparent',
    danger: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] active:bg-[#8e3c1f] border border-transparent',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-5 py-2.5',
    lg: 'text-base px-6 py-3',
    icon: 'p-2',
  };

  const radius = pill ? 'rounded-3xl' : 'rounded-lg';

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${radius} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
