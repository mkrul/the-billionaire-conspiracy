import { useState, useEffect, useCallback } from 'react';
import { NetworkData, NetworkDataLoadingState } from '../types/NetworkData';
import { loadNetworkData } from '../utils/dataLoader';

/**
 * Hook to load and manage network data state.
 * Handles loading, success, and error states for the network data.
 *
 * Features:
 * - Automatic data loading on mount
 * - Manual refresh capability
 * - Loading state management
 * - Error handling
 * - TypeScript support
 *
 * @returns Object containing loading state, data, error, and refresh function
 *
 * @example
 * ```tsx
 * function NetworkGraph() {
 *   const { status, data, error, refresh } = useNetworkData();
 *
 *   if (status === 'loading') return <LoadingSpinner />;
 *   if (status === 'error') return <ErrorMessage message={error} onRetry={refresh} />;
 *   if (!data) return null;
 *
 *   return (
 *     <>
 *       <Graph data={data} />
 *       <RefreshButton onClick={refresh} />
 *     </>
 *   );
 * }
 * ```
 */
export function useNetworkData() {
  const [state, setState] = useState<NetworkDataLoadingState>({
    status: 'idle'
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, status: 'loading' }));

    try {
      const data = await loadNetworkData();
      setState({ status: 'success', data });
    } catch (error) {
      setState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to load network data'
      });
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refresh: fetchData
  };
}

/**
 * Error boundary component for handling network data errors.
 * Use this to wrap components that depend on network data.
 */
export function NetworkDataErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Network Data Error:', error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div role="alert">
        <h2>Something went wrong loading the network data.</h2>
        <button onClick={() => window.location.reload()}>
          Reload Page
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
