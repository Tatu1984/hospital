import { useEffect, useState } from 'react';
import { MapPin, ShieldCheck } from 'lucide-react';
import { securityAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type Status = 'GRANTED' | 'DENIED' | 'PENDING' | 'NONE';

async function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });
  });
}

/**
 * Shown to every signed-in user. If they haven't granted precise-location
 * sharing, a consent modal appears (on every login until they Allow). If they
 * already granted, we silently refresh the fix in the background — the browser
 * permission is already held, so there's no popup.
 *
 * This is the headline accuracy lever: IP geo is city-accurate at best, while
 * navigator.geolocation (with consent) is metre-accurate.
 */
export default function LocationConsentGate() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await securityAPI.getConsent();
        const status = (res.data?.status ?? 'NONE') as Status;
        if (cancelled) return;

        if (status === 'GRANTED') {
          // Already consented — refresh the location quietly (no UI, no popup).
          try {
            const pos = await getPosition();
            await securityAPI.setConsent({
              status: 'GRANTED',
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          } catch {
            /* permission may have been revoked in the browser; ignore */
          }
        } else {
          // NONE / DENIED / PENDING → ask again.
          setOpen(true);
        }
      } catch {
        /* network/endpoint issue — don't block the app */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const allow = async () => {
    setBusy(true);
    setError(null);
    try {
      const pos = await getPosition();
      await securityAPI.setConsent({
        status: 'GRANTED',
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
      setOpen(false);
    } catch {
      await securityAPI.setConsent({ status: 'DENIED' }).catch(() => {});
      setError(
        'Location was blocked by your browser. Please allow location access for this site (check the address-bar icon), then try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const notNow = async () => {
    setBusy(true);
    try {
      await securityAPI.setConsent({ status: 'DENIED' }).catch(() => {});
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  if (!user || !open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <MapPin className="h-5 w-5 text-blue-600" />
            Share your precise location
          </h2>
          <div className="space-y-3 pt-3 text-sm text-gray-600">
            <p>
              To verify where you sign in from, this hospital workspace asks for your{' '}
              <strong>precise device location</strong>. This is more accurate than the approximate
              city we currently detect from your network.
            </p>
            <p className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-blue-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Your location is shared only with your administrators, used for login/attendance
                verification, and only while you consent. You can decline.
              </span>
            </p>
            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={notNow}
            disabled={busy}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={allow}
            disabled={busy}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? 'Requesting…' : 'Allow precise location'}
          </button>
        </div>
      </div>
    </div>
  );
}
