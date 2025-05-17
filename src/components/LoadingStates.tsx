import React from 'react';

export function LoadingSpinner() {
  return (
    <div role="status" className="loading-spinner">
      <div className="spinner-ring"></div>
      <span className="sr-only">Loading network data...</span>
    </div>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="error-message">
      <p>{message}</p>
      <button onClick={onRetry} className="retry-button">
        Try Again
      </button>
    </div>
  );
}

export function EmptyState() {
  return (
    <div role="status" className="empty-state">
      <p>No network data available.</p>
    </div>
  );
}
