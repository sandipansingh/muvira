import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const textareaId = id || Math.random().toString(36).substring(2, 9);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-semibold text-secondary700 tracking-wider uppercase">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={`w-full px-4 py-2 text-sm text-darkColor bg-white border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
            error
              ? 'border-dangerColor focus:ring-dangerColor/30'
              : 'border-secondary300 focus:ring-primaryBg/30 focus:border-primaryBg'
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs font-medium text-dangerColor">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
