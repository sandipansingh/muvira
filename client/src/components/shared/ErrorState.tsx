import React from 'react';
import { AlertCircle } from 'lucide-react';
import Button from '../ui/Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Something went wrong. Please try again later.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-rose-50/50 border border-rose-100 rounded-xl max-w-lg mx-auto my-6">
      <AlertCircle className="w-10 h-10 text-rose-500 mb-3 shrink-0" />
      <h3 className="text-sm md:text-base font-semibold tracking-wide text-rose-900 mb-1">
        Unable to load data
      </h3>
      <p className="text-xs md:text-sm text-rose-700 tracking-wide mb-5">
        {message}
      </p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
