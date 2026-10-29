const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g
const DIACRITIC_CHAR = /[ؐ-ًؚ-ٰٟۖ-ۭ]/

export function stripDiacritics(text: string) {
  return text.replace(DIACRITICS, '')
}

/** Map an offset in diacritics-stripped text back to the original text. */
export function originalOffset(original: string, strippedOffset: number) {
  let seen = 0
  for (let i = 0; i < original.length; i++) {
    if (DIACRITIC_CHAR.test(original[i])) continue
    if (seen === strippedOffset) return i
    seen++
  }
  return original.length
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

export function bnNum(value: number | string) {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)])
}

export function arNum(value: number | string) {
  return String(value).replace(/\d/g, (d) => AR_DIGITS[Number(d)])
}

export function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function parseTime(value: string | null | undefined) {
  if (!value) return null
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value)
  const parts = value.split(':').map(Number)
  if (parts.some(Number.isNaN)) return null
  return parts.reduce((acc, part) => acc * 60 + part, 0)
}

/** Deterministic hue from a string, for generated avatars and covers. */
export function hashString(text: string) {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0
  return Math.abs(hash)
}

/**
 * Monogram letter for an Arabic name: the first letter of the name, skipping "ابن" so that
 * ابن تيمية gives "ت", and dropping the article, e.g. الألباني → "أ".
 */
export function arabicInitial(name: string) {
  const words = stripDiacritics(name).replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean)
  const word = words.find((w) => w !== 'ابن' && w !== 'بن') ?? words[0] ?? ''
  return word.replace(/^ال(?=..)/, '')[0] ?? ''
}

export const STATUS_LABELS: Record<string, string> = {
  reading: 'পড়ছি',
  read_later: 'পরে পড়ব',
  on_hold: 'স্থগিত',
  completed: 'পড়া শেষ',
  dropped: 'বাদ দিয়েছি',
}

export const STATUS_ORDER = ['reading', 'read_later', 'on_hold', 'completed', 'dropped'] as const

/** "৫ মিনিট আগে", "৩ দিন আগে" — coarse Bangla relative time for the last reading session. */
export function timeAgo(iso: string | null) {
  if (!iso) return null
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  const steps: [number, string][] = [
    [60, 'সেকেন্ড'],
    [60, 'মিনিট'],
    [24, 'ঘণ্টা'],
    [30, 'দিন'],
    [12, 'মাস'],
    [Infinity, 'বছর'],
  ]
  let value = seconds
  for (const [size, unit] of steps) {
    if (value < size) return unit === 'সেকেন্ড' ? 'এইমাত্র' : `${bnNum(Math.floor(value))} ${unit} আগে`
    value /= size
  }
  return null
}
