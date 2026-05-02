import { useEffect, useRef } from 'react';

/**
 * Plug-and-play barcode / RFID scanner hook.
 *
 * Most cheap-to-mid-range scanners (1D barcode, 2D QR, USB RFID readers in
 * "HID keyboard emulation" mode — which is the default mode on virtually all
 * sub-₹5,000 hardware) do exactly one thing when they read a tag:
 *
 *   1. Type the tag string as a sequence of keystrokes.
 *   2. Press Enter (Carriage Return).
 *
 * That's identical to a very fast typist using the page's currently-focused
 * input. So we don't need device drivers, vendor SDKs, or per-model config
 * — we just need to recognise the *signature* of a scan vs. human typing:
 *
 *   - Inter-keystroke gap is consistently small (< 50 ms). A human typing
 *     fast manages ~150 ms; a scanner is closer to 5-15 ms.
 *   - Total burst takes < 500 ms regardless of length.
 *   - Burst ends with Enter.
 *
 * When we detect that pattern, we call the registered handler with the
 * captured string and PREVENT the Enter from also submitting whatever form
 * is in focus. If the user is just typing, we ignore the buffer entirely.
 *
 * This makes any HID-keyboard-mode scanner "just work" the moment it's
 * plugged in. No browser permission prompts, no pairing, no settings.
 *
 * Caveats:
 *   - Some readers append CR-LF instead of just CR; we strip both.
 *   - Multi-page apps need to use the hook only on the page that wants the
 *     scan, not globally — otherwise hitting Enter on a non-scan form on
 *     another tab gets eaten. We default to "active when mounted".
 *   - For non-HID-keyboard readers (rare, usually high-end Zebra DS-series
 *     in HID-POS mode), pair via WebHID instead — see `pairWebHIDReader`.
 */

export interface UseScannerOptions {
  /** Called with the captured scan when a burst-then-Enter is recognised. */
  onScan: (value: string) => void;
  /**
   * Max ms between consecutive keys for them to count as part of the same
   * scan. Default 50 ms — well under the ~150 ms a human typist averages.
   */
  maxKeyGapMs?: number;
  /**
   * Minimum length of a scan. Defaults to 4. Filters out single Enter keys
   * being interpreted as a 1-char scan.
   */
  minScanLength?: number;
  /**
   * Maximum length of a scan, defending against a user holding a key. RFID
   * tags are typically 8-24 chars; barcodes top out around 64.
   */
  maxScanLength?: number;
  /**
   * If true, swallow the trailing Enter so the scan doesn't double-submit a
   * form that happens to be focused. Default true.
   */
  swallowEnter?: boolean;
  /**
   * If false, the hook is registered but doesn't fire onScan. Useful for
   * mode toggles ("scan-to-fill" vs "scan-to-add").
   */
  enabled?: boolean;
}

export function useScanner({
  onScan,
  maxKeyGapMs = 50,
  minScanLength = 4,
  maxScanLength = 128,
  swallowEnter = true,
  enabled = true,
}: UseScannerOptions): void {
  // Use refs so changing the handler between renders doesn't tear down the
  // listener.
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    let buffer = '';
    let lastKeyAt = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      const now = performance.now();
      const gap = now - lastKeyAt;
      lastKeyAt = now;

      // Reset the buffer if we've been idle (a new scan is starting, or this
      // is a human keystroke with no scan in progress).
      if (gap > maxKeyGapMs) {
        buffer = '';
      }

      // The Enter at the end of a scan is the trigger. If the buffer is
      // long enough AND the burst was tight, treat it as a scan.
      if (event.key === 'Enter') {
        const tag = buffer.replace(/[\r\n\t]/g, '').trim();
        buffer = '';
        if (tag.length >= minScanLength && tag.length <= maxScanLength) {
          // Heuristic: the burst was scan-fast if every key arrived within
          // maxKeyGapMs. We tracked that by resetting the buffer above when
          // any gap was too long. So if the buffer survived to here, it's a
          // scan. Defend against a stray short input by also requiring the
          // buffer to look "scanner-y" — printable ASCII only.
          if (/^[\x20-\x7e]+$/.test(tag)) {
            if (swallowEnter) {
              event.preventDefault();
              event.stopPropagation();
            }
            onScanRef.current(tag);
          }
        }
        return;
      }

      // Ignore modifier keys, function keys, navigation. We only care about
      // printable single-char keys that a scanner would emit.
      if (event.key.length !== 1) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      buffer += event.key;
      if (buffer.length > maxScanLength) {
        buffer = ''; // overflow — definitely not a scan
      }
    };

    // Capture phase so we see the keystrokes BEFORE inputs/forms react. This
    // is what lets us preventDefault() the Enter cleanly.
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true } as any);
    };
  }, [enabled, maxKeyGapMs, minScanLength, maxScanLength, swallowEnter]);
}

// ============================================================================
// WebHID fallback for the rare reader that doesn't emulate a keyboard.
// ============================================================================

/**
 * Browser-feature detection — `navigator.hid` is available on Chrome 89+ /
 * Edge 89+. Safari and Firefox do not support WebHID (as of 2026-05).
 *
 * If your reader is HID-keyboard mode (the default for 95% of devices), you
 * don't need this — use `useScanner` and the scanner just types. Use this
 * only if the device explicitly advertises a non-keyboard HID interface.
 */
export function isWebHIDSupported(): boolean {
  return typeof navigator !== 'undefined' && 'hid' in navigator;
}

/**
 * Open the browser's "select a device" dialog and remember the chosen reader
 * for next time. Returns the connected HIDDevice. Caller is responsible for
 * device.addEventListener('inputreport', ...) to actually receive scans —
 * the report decoder is vendor-specific.
 *
 * Filters: leave empty to let the user pick anything plugged in. For a
 * specific brand, pass `[{ vendorId: 0x072f }]` (ACS) or similar. Vendor
 * IDs for common readers:
 *   ACS / ACR122U / ACR1252 → 0x072f
 *   Identiv / SCM Micro     → 0x04e6
 *   Zebra DS-series         → 0x05e0
 *   Honeywell Voyager       → 0x0c2e
 */
export async function pairWebHIDReader(filters: Array<{ vendorId?: number; productId?: number }> = []): Promise<any> {
  if (!isWebHIDSupported()) {
    throw new Error('WebHID not supported in this browser. Use Chrome or Edge, or use a HID-keyboard mode scanner with useScanner().');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav: any = navigator;
  const devices = await nav.hid.requestDevice({ filters });
  if (!devices.length) throw new Error('No device selected');
  const device = devices[0];
  if (!device.opened) await device.open();
  return device;
}
