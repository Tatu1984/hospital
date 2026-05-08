// Status card shown at the top of any module page that depends on a
// third-party integration. Renders three states based on the result of
// useIntegration():
//
//   • Loading — skeleton
//   • Connected (integration exists + enabled) — green banner with
//     provider name, base URL, last-test status, and a Re-test button
//     that fires POST /api/admin/integrations/:id/test (admin only)
//   • Not connected — amber banner with a "Configure in System Control"
//     deep-link, plus the optional setup notes the page author provides
//
// Pages that previously rendered ScaffoldPage now compose: this card
// at the top, plus their actual functionality below (which can be
// gated on `integration` being non-null).

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, AlertCircle, Plug, RefreshCw, ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useIntegration, type ActiveIntegration } from '../../lib/useIntegration';

interface Props {
  /** Integration category to look up (sms, email, payment, telemed, accounting, dicom, lab_analyzer, ...) */
  category: string;
  /** Optional module slug — prefer integrations that target this module */
  targetModule?: string;
  /** Display name shown in the "configure" prompt */
  label: string;
  /** Suggested provider preset (passed through to System Control deep link) */
  suggestedProvider?: string;
  /** Markdown-ish setup steps shown when not connected */
  setupSteps?: string[];
  /** Render below the status card with the integration in scope */
  children?: (integration: ActiveIntegration | null) => React.ReactNode;
}

export default function IntegrationStatusCard({
  category, targetModule, label, suggestedProvider, setupSteps, children,
}: Props) {
  const { integration, loading, reload } = useIntegration(category, targetModule);
  const [testing, setTesting] = useState(false);

  async function retest() {
    if (!integration) return;
    setTesting(true);
    try {
      // This endpoint requires system:manage. Non-admins will get 403;
      // we just surface that as a hint.
      const r = await api.post(`/api/admin/integrations/${integration.id}/test`);
      const ok = r.data?.ok;
      alert(ok ? `✓ Connection OK\n${r.data.result}` : `✗ ${r.data.result}`);
      reload();
    } catch (e: any) {
      if (e?.response?.status === 403) {
        alert('Only admins can re-test integrations.');
      } else {
        alert(e?.response?.data?.error || 'Test failed');
      }
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-sm text-slate-500">
          Checking integration status…
        </CardContent>
      </Card>
    );
  }

  if (integration) {
    const ok = integration.lastTestStatus === 'ok';
    const failed = integration.lastTestStatus === 'failed';
    return (
      <>
        <Card className={ok ? 'border-emerald-200 bg-emerald-50/40' : failed ? 'border-red-200 bg-red-50/40' : 'border-blue-200 bg-blue-50/40'}>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-md flex items-center justify-center ${ok ? 'bg-emerald-600' : failed ? 'bg-red-600' : 'bg-blue-600'}`}>
                  <Plug className="w-4 h-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Connected to {integration.name}
                    <Badge variant="outline" className="text-xs">{integration.provider}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {integration.baseUrl || 'No base URL configured'}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={retest} disabled={testing}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${testing ? 'animate-spin' : ''}`} />
                  {testing ? 'Testing…' : 'Re-test'}
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/app/system-control">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Configure
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-xs">
            {ok && (
              <div className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-3 h-3" /> Last test: {integration.lastTestResult}
                {integration.lastTestedAt && <span className="text-slate-500 ml-2">· {new Date(integration.lastTestedAt).toLocaleString()}</span>}
              </div>
            )}
            {failed && (
              <div className="flex items-center gap-1 text-red-700">
                <AlertCircle className="w-3 h-3" /> Last test failed: {integration.lastTestResult}
              </div>
            )}
            {integration.lastTestStatus === 'never' && (
              <div className="text-slate-500">Connection not yet tested. Click "Re-test" to verify.</div>
            )}
          </CardContent>
        </Card>
        {children?.(integration)}
      </>
    );
  }

  // Not connected — render setup banner
  const deepLink = `/app/system-control${suggestedProvider ? `?integration=${suggestedProvider}` : ''}`;
  return (
    <>
      <Card className="border-amber-200 bg-amber-50/40">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-amber-500 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">{label} not connected</CardTitle>
                <CardDescription>
                  Add an integration in System Control → Integrations to activate this module.
                </CardDescription>
              </div>
            </div>
            <Button asChild>
              <Link to={deepLink}>
                <Plug className="w-4 h-4 mr-1" /> Configure integration
              </Link>
            </Button>
          </div>
        </CardHeader>
        {setupSteps && setupSteps.length > 0 && (
          <CardContent>
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Setup steps</div>
            <ol className="space-y-1 text-sm text-slate-700 list-decimal pl-5">
              {setupSteps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </CardContent>
        )}
      </Card>
      {children?.(null)}
    </>
  );
}
