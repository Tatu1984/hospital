# AI Clinical Copilot — Point 1

**Point 1 shipped.** Commit `9b65c62` on both `main` and `develop`.

## How to enable + test locally

1. **Get an Anthropic API key** from console.anthropic.com → API Keys → Create. (Console has a free trial credit; clinical copilot calls average ~$0.005 each with prompt caching.)

2. **Add it to backend env:**
   ```sh
   echo 'ANTHROPIC_API_KEY=sk-ant-...' >> backend/.env
   ```

3. **Restart the backend** (the SDK reads the key at first use, but a fresh process is cleaner):
   ```sh
   pkill -f "tsx watch" ; cd backend && nohup npm run dev > /tmp/hms_backend.log 2>&1 &
   ```

4. **Try it:** http://localhost:5173/app/patients → click any patient → click the violet **"AI Copilot"** button (top-right of Overview tab, next to Prescribe).
   - **SOAP tab**: click **🎤 Dictate** (Chrome/Edge), say *"Patient is a 58-year-old man presenting with crushing central chest pain for 2 hours, radiating to the left arm. Vitals 145 over 90, heart rate 110, oxygen sat 96 percent. Lungs clear, no JVD, no peripheral oedema. Started on aspirin 325 milligrams, ordered ECG and troponin, planning cardiology consult."* → click stop → **Draft SOAP** → returns a structured 4-section note.
   - **DDx tab**: chief complaint = `crushing chest pain, 2hr, radiating to left arm`. Submit → ranked differentials with confirm/rule-out columns.
   - **Summary tab**: 1-click hand-off summary of everything in the chart.
   - **Explain tab**: paste a discharge diagnosis, pick **हिन्दी (Hindi)**, audience **Patient** → returns Devanagari-script plain-language version with "when to call the doctor" warnings.

5. **Verify prompt caching works:** every call's AuditLog row has `cacheReadTokens` / `cacheWriteTokens`. The first call writes the system prompt cache; subsequent calls within 5 minutes read it (~90% cheaper). You can see this in `/app/audit-log` — filter by action `COPILOT_*`.

## What you can change without code

- **Rate limit**: edit `RATE_LIMIT_MAX` in `clinical-copilot.ts` (default 10/hr).
- **Model**: swap `MODEL` const to `claude-sonnet-4-6` for ~5x lower cost at slight quality drop. Adaptive thinking works on both.
- **Add languages**: append codes to the `language` enum + the `langName` map in `clinical-copilot.ts`.

## Next up

Point 2 — **Live ops "war room" dashboard**. Want me to start it now, or do you want to test the copilot end-to-end first?
