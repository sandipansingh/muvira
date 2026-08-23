import React, { forwardRef } from 'react'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean
  errorMessage?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError = false, errorMessage, className = '', disabled, ...props }, ref) => {
    const isError = hasError || Boolean(errorMessage)

    const textareaElement = (
      <textarea
        ref={ref}
        disabled={disabled}
        className={`w-full rounded-[var(--radius-control)] bg-white border px-3.5 py-2.5 text-base text-ink placeholder:text-muted transition-colors focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-surface disabled:text-disabled ${
          isError
            ? 'border-danger focus:border-danger focus:ring-danger'
            : 'border-field-border focus:border-ink focus:ring-ink'
        } ${className}`}
        {...props}
      />
    )

    if (errorMessage) {
      return (
        <div className="w-full">
          {textareaElement}
          <p className="mt-1 text-xs text-danger">{errorMessage}</p>
        </div>
      )
    }

    return textareaElement
  }
)

Textarea.displayName = 'Textarea'
