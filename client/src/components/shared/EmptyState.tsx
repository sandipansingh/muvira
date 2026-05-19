import React from 'react';
import Button from '../ui/Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 bg-white rounded-xl border border-secondary200 max-w-lg mx-auto my-6">
      {icon && <div className="text-secondary400 mb-4">{icon}</div>}
      <h3 className="text-base md:text-lg font-semibold tracking-wide text-darkColor mb-1.5">
        {title}
      </h3>
      <p className="text-xs md:text-sm text-secondary600 tracking-wide mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
