import { useEffect } from 'react';
import SyncStatusIndicator from './SyncStatusIndicator';
import { GlobalErrorBoundary } from './GlobalErrorBoundary';

interface MainLayoutWrapperProps {
  children: React.ReactNode;
}

export default function MainLayoutWrapper({ children }: MainLayoutWrapperProps) {
  useEffect(() => {
    // Initialize any global state if needed
    console.log('MainLayoutWrapper initialized');
  }, []);

  return (
    <GlobalErrorBoundary>
      {children}
      <SyncStatusIndicator />
    </GlobalErrorBoundary>
  );
}