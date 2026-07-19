/** مسیر دارایی‌های public با درنظرگرفتن base (مثلاً GitHub Pages) */
export function publicUrl(path) {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = String(path).replace(/^\/+/, '')
  return `${base}${normalized}`
}
