export function localToday(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function addDays(date: string, amount: number): string {
  const value = new Date(date + 'T12:00:00');
  value.setDate(value.getDate() + amount);
  return localToday(value);
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00');
  return Number.isFinite(date.getTime()) && localToday(date) === value;
}
export function dateRangeError(start: string | null | undefined, end: string | null | undefined, required = true, today = localToday()): string {
  if (!start && !end && !required) return '';
  if (!start || !end) return 'Selecciona la fecha de llegada y la fecha de salida.';
  if (!validDate(start) || !validDate(end)) return 'Introduce fechas válidas.';
  if (start < today) return 'La fecha de llegada no puede estar en el pasado.';
  if (end <= start) return 'La salida debe ser posterior a la llegada.';
  return '';
}
export function overlaps(start: string, end: string, otherStart: string, otherEnd: string): boolean {
  return start < otherEnd && end > otherStart;
}
