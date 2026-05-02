# Plug-and-Play Scanners (Barcode + RFID)

The HMS supports any USB barcode or RFID reader that operates in
**HID-keyboard emulation mode** — which is the factory default for ~95% of
sub-₹5,000 hardware. There's no driver to install, no setup step, and no
browser permission prompt.

> **TL;DR**: Plug it in. Open the Pharmacy → POS tab. Scan. The drug is
> added to the cart.

---

## What's a "HID-keyboard mode" scanner?

It's a scanner that, when it reads a tag, types the tag string and presses
Enter — exactly like a very fast typist on a USB keyboard. The PC sees a
plain old keyboard, so any browser, any OS, no driver.

You can confirm a scanner is in HID-keyboard mode by:

1. Plugging it in.
2. Opening any text field (Notes, Word, a search box).
3. Scanning a tag.
4. The tag string appears in the field, followed by an automatic line break.

If that works → it works with the HMS. If it doesn't, see the troubleshooting
section below.

---

## What's known to work

| Class | Examples | Price (India) | Notes |
|---|---|---|---|
| **1D barcode** | Honeywell Voyager 1200g, TVS BS-i101 Star, Pegasus PS3260 | ₹1,000-3,000 | Fastest scan; works on any printed barcode |
| **2D barcode / QR** | Honeywell HF600, Zebra DS2208, Synta SD-3110 | ₹2,500-7,000 | Reads 1D + 2D + on-screen codes |
| **USB RFID (HID-keyboard mode)** | EM4100/T5577 readers, Mifare 13.56 MHz USB readers like Micromax/Generic ESD-BC150 | ₹800-2,500 | Most cheap RFID readers default to HID mode |
| **NFC USB readers (HID mode)** | ACR1252U (in HID mode), Identiv SCM uTrust 4701 F | ₹3,000-6,000 | Default mode is PC/SC; **switch to HID mode** via vendor utility |

For higher-end Zebra DS-9908R, Honeywell Genesis 7580, etc., they all ship
in HID-keyboard mode by default.

---

## How a scan flows through the app

1. Operator scans a tag — the scanner types the tag + Enter as keystrokes.
2. A global keystroke listener (`useScanner` hook) detects the burst pattern
   (rapid keys ending in Enter) and treats it as a scan.
3. The scanned value is looked up in the local drug list, then via
   `GET /api/drugs/by-tag?value=…` which checks barcode → rfidTag → id.
4. Match → drug added to cart. No match → friendly "enroll this tag first"
   error.

The detection is heuristic: bursts where every keystroke arrives within
50 ms of the last one count as scans. A human typist averages ~150 ms, so
manual typing is ignored. **Hold-down keys** (someone resting on a key) are
also ignored — the buffer overflows and resets.

---

## Enrolling a tag (binding a physical tag to a drug)

1. Open **Master Data → Drugs** as a user with `pharmacy:manage`.
2. Edit an existing drug or add a new one.
3. The drug form has two new fields at the bottom: **Barcode** and
   **RFID tag**.
4. Click into either field.
5. Scan the physical tag — the value fills automatically.
6. Save.

That tag is now bound to the drug. The next time anyone scans it on the POS,
the right drug pops into the cart.

You can bind both a barcode AND an RFID tag to the same drug. Either one
will scan it.

---

## Troubleshooting

### "I scan and nothing happens"

1. **Test outside the HMS first.** Open any text field (browser address
   bar, Notepad) and scan. If nothing appears, the scanner isn't in
   HID-keyboard mode — see "Switching modes" below.
2. **Check the burst speed.** A typical scanner takes < 100 ms total to
   send a 12-character tag. If yours is slower (some old serial-converter
   models) it might exceed our 50 ms inter-key gap. Set the scanner's
   transmit speed / inter-key delay to its fastest setting (consult the
   scanner manual).
3. **Caps Lock.** If Caps Lock is on, some scanners send uppercase
   gibberish. Toggle it off.
4. **Page focus.** The hook listens window-wide while the page is mounted,
   but the page must be the focused tab. Click anywhere on the HMS tab
   first.

### "It scans but drops me at the wrong page / submits a form"

We swallow the trailing Enter to prevent that, but it can still happen if
your scanner sends a TAB instead of Enter. Switch the scanner's terminator
to "ENTER" / "CR" in its config (most have a programming barcode in the
manual that does this in one scan).

### "It scans but the drug isn't found"

Either:
- The tag isn't enrolled yet → enroll it via Master Data → Drugs.
- The tag is enrolled but on a different drug code than the operator
  expected → Master Data → Drugs → search the tag value.

### "I have a high-end NFC reader that doesn't emulate keyboard"

If your reader exposes a vendor-specific HID interface (e.g. ACR1252U in
PC/SC mode), you have two options:

1. **Switch the reader to HID-keyboard mode** using the manufacturer's
   utility. ACS provides "ACR1252U Programming Tool"; Identiv has a
   similar one. Most readers can be reflashed to HID-keyboard mode in
   under a minute.

2. **Pair via WebHID** (Chrome/Edge only): the codebase ships a
   `pairWebHIDReader()` helper but no UI for it yet. Wiring it requires
   the reader's vendor ID + a vendor-specific report decoder (each model
   formats input reports differently). Contact us if your reader requires
   this — typically ~1 day of integration work.

### "I want a single tag to identify a patient, not a drug"

Same scanner hardware, different schema. The current implementation only
covers Drug → tag binding. Patient wristbands (admit → print RFID
wristband → scan at every encounter) is a separate feature; reach out
if it's in scope.

---

## Performance & limits

- The hook adds ~5 lines of work per keystroke and does nothing on idle —
  no measurable performance impact.
- Tag length: minimum 4 chars, maximum 128. Most barcodes are 8-13 chars
  (EAN-13, UPC-A); RFID tags are typically 8-24 hex chars.
- Special characters: only printable ASCII (0x20-0x7E) is accepted. Tags
  with embedded control characters won't scan.
- The lookup endpoint is rate-limited under the global write rate-limit
  (no separate quota). A single operator scanning a cart of 50 drugs is
  well under the threshold.

---

## Security notes

- Tags themselves are not secrets. RFID tags can be cloned with a
  ₹3,000 reader/writer; barcodes can be photographed. The HMS treats them
  as **identifiers, not credentials** — you can't "log in" by scanning a
  tag, only look up a drug.
- The `barcode` and `rfidTag` columns are global-unique (one tag = one
  drug, ever). If two tenants stock the same SKU they share the tag —
  this is correct behaviour for manufacturer-assigned codes.
- The lookup endpoint requires `pharmacy:view` permission. An attacker
  who steals an operator's session can enumerate the tag space, but
  can't create/modify tags without `pharmacy:manage`.
