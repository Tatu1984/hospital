/**
 * Compute whole-year age from a YYYY-MM-DD date string. Empty / unparseable
 * input yields ''. Future dates yield ''.
 *
 * Pure helper — used by the patient registration form to keep the age field
 * derived from the DOB. Kept as a string return so it plugs straight into
 * the `<Input value={...}>` of a controlled form.
 */
export function ageFromDateString(yyyymmdd: string): string {
  if (!yyyymmdd) return '';
  const d = new Date(yyyymmdd);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) years -= 1;
  return years >= 0 ? String(years) : '';
}
