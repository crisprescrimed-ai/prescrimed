import React from 'react';

export default function LoadingSpinner({ size = 'md', fullHeight = false }) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const spinnerSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`${fullHeight ? 'flex items-center justify-center h-full' : 'flex justify-center py-12'}`}>
      <div className={`animate-spin rounded-full border-b-2 border-primary-600 ${spinnerSize}`}></div>
    </div>
  );
}
