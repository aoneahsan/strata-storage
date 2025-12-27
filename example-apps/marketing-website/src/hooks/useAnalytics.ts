/**
 * React hook for analytics integration
 */

import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import analytics from '@/services/analytics';

/**
 * Hook to track page views automatically on route changes
 */
export function usePageTracking(): void {
  const location = useLocation();

  useEffect(() => {
    // Get page name from pathname
    const pageName = getPageNameFromPath(location.pathname);
    analytics.pageView(pageName, window.location.href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}

/**
 * Hook to get analytics functions
 */
export function useAnalytics() {
  const trackEvent = useCallback((eventName: string, params?: Record<string, string | number | boolean>) => {
    analytics.track(eventName, params);
  }, []);

  const trackButtonClick = useCallback((buttonName: string, additionalParams?: Record<string, string | number | boolean>) => {
    analytics.buttonClick(buttonName, additionalParams);
  }, []);

  const trackFormSubmit = useCallback((formName: string, success: boolean, additionalParams?: Record<string, string | number | boolean>) => {
    analytics.formSubmit(formName, success, additionalParams);
  }, []);

  const trackError = useCallback((errorType: string, errorMessage: string, additionalParams?: Record<string, string | number | boolean>) => {
    analytics.error(errorType, errorMessage, additionalParams);
  }, []);

  const trackNavigation = useCallback((from: string, to: string) => {
    analytics.navigation(from, to);
  }, []);

  const trackApiCall = useCallback((endpoint: string, method: string, success: boolean, duration?: number) => {
    analytics.apiCall(endpoint, method, success, duration);
  }, []);

  const setUserId = useCallback((userId: string | null) => {
    analytics.setUserId(userId);
  }, []);

  const setUserProperties = useCallback((properties: Record<string, string | number | boolean>) => {
    analytics.setUserProperties(properties);
  }, []);

  return {
    trackEvent,
    trackButtonClick,
    trackFormSubmit,
    trackError,
    trackNavigation,
    trackApiCall,
    setUserId,
    setUserProperties,
  };
}

/**
 * Convert pathname to readable page name
 */
function getPageNameFromPath(pathname: string): string {
  if (pathname === '/') return 'Home';

  // Remove leading slash and split by /
  const segments = pathname.slice(1).split('/');

  // Capitalize each segment and join with ' - '
  return segments
    .map((segment) => {
      // Handle kebab-case
      return segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    })
    .join(' - ');
}

export default useAnalytics;
