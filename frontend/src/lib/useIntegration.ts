// Reusable hook for module pages that depend on a third-party integration
// (Tally → AccuBook, Video Conversation → Zoom/Teams, DICOM → Orthanc,
// Medical Device → Mirth, etc.). Returns the active integration matching
// the requested category (and optionally a specific module binding) or
// null if nothing's configured yet — the page should then render its
// scaffolding/setup-instructions view.
//
// No credentials are returned; the public /api/integrations/active
// endpoint only exposes provider name, baseUrl, and last-test status.

import { useEffect, useState } from 'react';
import api from '../services/api';

export interface ActiveIntegration {
  id: string;
  name: string;
  category: string;
  provider: string;
  baseUrl: string | null;
  targetModules: string[];
  enabled: boolean;
  lastTestStatus: 'ok' | 'failed' | 'never' | null;
  lastTestResult: string | null;
  lastTestedAt: string | null;
}

interface UseIntegrationResult {
  integration: ActiveIntegration | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useIntegration(category: string, targetModule?: string): UseIntegrationResult {
  const [integration, setIntegration] = useState<ActiveIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/api/integrations/active', { params: { category, ...(targetModule ? { module: targetModule } : {}) } })
      .then((r) => {
        if (cancelled) return;
        // Prefer the first match (server already sorted by name).
        setIntegration(r.data[0] || null);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.error || 'Failed to load integration');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [category, targetModule, reloadKey]);

  return { integration, loading, error, reload: () => setReloadKey((k) => k + 1) };
}
