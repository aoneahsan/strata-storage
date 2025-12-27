/**
 * Centralized Analytics Service
 * Integrates Firebase Analytics, Microsoft Clarity, and Amplitude
 */

import { getAnalytics, logEvent, setUserId, setUserProperties, type Analytics } from 'firebase/analytics';
import app from '@/lib/firebase';

// Types
interface UserProperties {
  [key: string]: string | number | boolean;
}

// Extend window for analytics
declare global {
  interface Window {
    clarity?: (action: string, ...args: unknown[]) => void;
    amplitude?: {
      getInstance?: () => {
        logEvent?: (name: string, params?: Record<string, unknown>) => void;
        setUserId?: (id: string | null) => void;
        setUserProperties?: (props: Record<string, unknown>) => void;
        init?: (key: string) => void;
      };
    };
  }
}

// Initialize Firebase Analytics
let firebaseAnalytics: Analytics | null = null;

// Clarity and Amplitude initialization flags
let clarityInitialized = false;
let amplitudeInitialized = false;

/**
 * Initialize all analytics services
 */
export function initializeAnalytics(): void {
  // Firebase Analytics
  try {
    if (typeof window !== 'undefined') {
      firebaseAnalytics = getAnalytics(app);
    }
  } catch (error) {
    console.warn('Firebase Analytics initialization failed:', error);
  }

  // Microsoft Clarity
  initializeClarity();

  // Amplitude
  initializeAmplitude();
}

/**
 * Initialize Microsoft Clarity
 */
function initializeClarity(): void {
  const clarityId = import.meta.env.VITE_CLARITY_PROJECT_ID;

  if (!clarityId || clarityInitialized || typeof window === 'undefined') {
    return;
  }

  try {
    // Create clarity queue function
    window.clarity = window.clarity || function(...args: unknown[]) {
      ((window.clarity as unknown as { q: unknown[] }).q = (window.clarity as unknown as { q: unknown[] }).q || []).push(args);
    };

    // Load Clarity script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${clarityId}`;
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);

    clarityInitialized = true;
  } catch (error) {
    console.warn('Clarity initialization failed:', error);
  }
}

/**
 * Initialize Amplitude
 */
function initializeAmplitude(): void {
  const amplitudeKey = import.meta.env.VITE_AMPLITUDE_API_KEY;

  if (!amplitudeKey || amplitudeInitialized || typeof window === 'undefined') {
    return;
  }

  try {
    // Load Amplitude script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://cdn.amplitude.com/libs/amplitude-8.18.4-min.gz.js';

    script.onload = function() {
      if (window.amplitude?.getInstance) {
        window.amplitude.getInstance()?.init?.(amplitudeKey);
      }
    };

    const firstScript = document.getElementsByTagName('script')[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);

    amplitudeInitialized = true;
  } catch (error) {
    console.warn('Amplitude initialization failed:', error);
  }
}

/**
 * Track an event across all analytics platforms
 */
export function trackEvent(eventName: string, params?: Record<string, string | number | boolean>): void {
  // Firebase Analytics
  if (firebaseAnalytics) {
    try {
      logEvent(firebaseAnalytics, eventName, params);
    } catch (error) {
      console.warn('Firebase Analytics event failed:', error);
    }
  }

  // Microsoft Clarity
  if (clarityInitialized && typeof window !== 'undefined' && window.clarity) {
    try {
      window.clarity('event', eventName, params);
    } catch (error) {
      console.warn('Clarity event failed:', error);
    }
  }

  // Amplitude
  if (amplitudeInitialized && typeof window !== 'undefined' && window.amplitude?.getInstance) {
    try {
      window.amplitude.getInstance()?.logEvent?.(eventName, params);
    } catch (error) {
      console.warn('Amplitude event failed:', error);
    }
  }
}

/**
 * Set user ID across all analytics platforms
 */
export function setAnalyticsUserId(userId: string | null): void {
  // Firebase Analytics
  if (firebaseAnalytics) {
    try {
      setUserId(firebaseAnalytics, userId);
    } catch (error) {
      console.warn('Firebase Analytics setUserId failed:', error);
    }
  }

  // Microsoft Clarity
  if (clarityInitialized && typeof window !== 'undefined' && userId && window.clarity) {
    try {
      window.clarity('identify', userId);
    } catch (error) {
      console.warn('Clarity identify failed:', error);
    }
  }

  // Amplitude
  if (amplitudeInitialized && typeof window !== 'undefined' && window.amplitude?.getInstance) {
    try {
      window.amplitude.getInstance()?.setUserId?.(userId);
    } catch (error) {
      console.warn('Amplitude setUserId failed:', error);
    }
  }
}

/**
 * Set user properties across all analytics platforms
 */
export function setAnalyticsUserProperties(properties: UserProperties): void {
  // Firebase Analytics
  if (firebaseAnalytics) {
    try {
      setUserProperties(firebaseAnalytics, properties as Record<string, string>);
    } catch (error) {
      console.warn('Firebase Analytics setUserProperties failed:', error);
    }
  }

  // Microsoft Clarity
  if (clarityInitialized && typeof window !== 'undefined' && window.clarity) {
    try {
      Object.entries(properties).forEach(([key, value]) => {
        window.clarity?.('set', key, String(value));
      });
    } catch (error) {
      console.warn('Clarity set properties failed:', error);
    }
  }

  // Amplitude
  if (amplitudeInitialized && typeof window !== 'undefined' && window.amplitude?.getInstance) {
    try {
      window.amplitude.getInstance()?.setUserProperties?.(properties);
    } catch (error) {
      console.warn('Amplitude setUserProperties failed:', error);
    }
  }
}

/**
 * Track page view
 */
export function trackPageView(pageName: string, pageUrl?: string): void {
  trackEvent('page_view', {
    page_name: pageName,
    page_url: pageUrl || window.location.href,
    page_path: window.location.pathname,
  });
}

/**
 * Track button click
 */
export function trackButtonClick(buttonName: string, additionalParams?: Record<string, string | number | boolean>): void {
  trackEvent('button_click', {
    button_name: buttonName,
    ...additionalParams,
  });
}

/**
 * Track navigation
 */
export function trackNavigation(from: string, to: string): void {
  trackEvent('navigation', {
    from_page: from,
    to_page: to,
  });
}

/**
 * Track form submission
 */
export function trackFormSubmit(formName: string, success: boolean, additionalParams?: Record<string, string | number | boolean>): void {
  trackEvent('form_submit', {
    form_name: formName,
    success,
    ...additionalParams,
  });
}

/**
 * Track error
 */
export function trackError(errorType: string, errorMessage: string, additionalParams?: Record<string, string | number | boolean>): void {
  trackEvent('error', {
    error_type: errorType,
    error_message: errorMessage,
    ...additionalParams,
  });
}

/**
 * Track API call
 */
export function trackApiCall(endpoint: string, method: string, success: boolean, duration?: number): void {
  trackEvent('api_call', {
    endpoint,
    method,
    success,
    ...(duration !== undefined && { duration_ms: duration }),
  });
}

// Export analytics object for convenience
export const analytics = {
  init: initializeAnalytics,
  track: trackEvent,
  setUserId: setAnalyticsUserId,
  setUserProperties: setAnalyticsUserProperties,
  pageView: trackPageView,
  buttonClick: trackButtonClick,
  navigation: trackNavigation,
  formSubmit: trackFormSubmit,
  error: trackError,
  apiCall: trackApiCall,
};

export default analytics;
