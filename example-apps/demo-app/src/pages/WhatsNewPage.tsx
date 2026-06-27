import ProviderFreeDemo from '../components/ProviderFreeDemo';
import SyncApiDemo from '../components/SyncApiDemo';
import UrlStateDemo from '../components/UrlStateDemo';
import DisasterRecoveryDemo from '../components/DisasterRecoveryDemo';

/**
 * Live examples for recent strata-storage APIs. The page highlights the 2.5.0
 * feature additions and notes the current 2.7.0 production-polish fixes.
 */
export default function WhatsNewPage() {
  return (
    <div>
      <h1 className="page-title">What&apos;s New Through 2.7.0</h1>
      <p className="page-desc">
        Living examples of the provider-free, sync, URL-state, and disaster-recovery APIs, now
        running against the 2.7.0 package with namespace, clear, query, and native polish fixes.
      </p>

      <ProviderFreeDemo />
      <SyncApiDemo />
      <UrlStateDemo />
      <DisasterRecoveryDemo />
    </div>
  );
}
