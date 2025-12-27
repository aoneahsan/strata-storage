import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { initializeAnalytics } from '@/services/analytics';
import { usePageTracking } from '@/hooks/useAnalytics';

import HomePage from '@/pages/HomePage';
import FeaturesPage from '@/pages/FeaturesPage';
import DocsPage from '@/pages/DocsPage';
import LoginPage from '@/pages/LoginPage';
import FeedbackPage from '@/pages/FeedbackPage';
import DashboardPage from '@/pages/DashboardPage';
import CodeAccessPage from '@/pages/CodeAccessPage';
import PrivacyPage from '@/pages/PrivacyPage';
import TermsPage from '@/pages/TermsPage';
import SitemapPage from '@/pages/SitemapPage';
import NotFoundPage from '@/pages/NotFoundPage';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
import AccountDeletionPage from '@/pages/AccountDeletionPage';
import DataDeletionPage from '@/pages/DataDeletionPage';
import CookiePolicyPage from '@/pages/CookiePolicyPage';
import GdprRightsPage from '@/pages/GdprRightsPage';

// Initialize analytics on app load
initializeAnalytics();

function App() {
  const location = useLocation();

  // Track page views on route changes
  usePageTracking();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/code-access" element={<CodeAccessPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/account-deletion" element={<AccountDeletionPage />} />
          <Route path="/data-deletion" element={<DataDeletionPage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />
          <Route path="/gdpr-rights" element={<GdprRightsPage />} />
          <Route path="/sitemap" element={<SitemapPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
