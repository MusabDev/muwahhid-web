import type { CSSProperties } from 'react'

export type ArabicFont = 'amiri' | 'noto-naskh-arabic' | 'kfgqpc-uthmanic' | 'scheherazade-new'
export type BanglaFont = 'noto-serif-bengali' | 'hind-siliguri' | 'kalpurush' | 'solaimanlipi'

export const ARABIC_FONTS: { key: ArabicFont; label: string; family: string }[] = [
  { key: 'amiri', label: 'Amiri', family: 'Amiri' },
  { key: 'noto-naskh-arabic', label: 'Noto Naskh', family: 'Noto Naskh Arabic' },
  { key: 'kfgqpc-uthmanic', label: 'KFGQPC Uthmanic', family: 'KFGQPC Uthmanic Script' },
  { key: 'scheherazade-new', label: 'Scheherazade', family: 'Scheherazade New' },
]

export const BANGLA_FONTS: { key: BanglaFont; label: string; family: string }[] = [
  { key: 'noto-serif-bengali', label: 'Noto Serif', family: 'Noto Serif Bengali' },
  { key: 'hind-siliguri', label: 'হিন্দ শিলিগুড়ি', family: 'Hind Siliguri' },
  { key: 'kalpurush', label: 'কালপুরুষ', family: 'Kalpurush' },
  { key: 'solaimanlipi', label: 'সোলায়মানলিপি', family: 'SolaimanLipi' },
]

const loaded = new Set<string>()

/** Fonts not on npm are served from /public/fonts and only fetched once used. */
const LOCAL_FONTS: Record<string, string> = {
  'kfgqpc-uthmanic': "@font-face{font-family:'KFGQPC Uthmanic Script';src:url('/fonts/KFGQPCUthmanicScriptHAFS.woff2') format('woff2'),url('/fonts/KFGQPCUthmanicScriptHAFS.otf') format('opentype');font-display:swap}",
  kalpurush: "@font-face{font-family:'Kalpurush';src:url('/fonts/kalpurush.woff2') format('woff2'),url('/fonts/kalpurush.ttf') format('truetype');font-display:swap}",
  solaimanlipi: "@font-face{font-family:'SolaimanLipi';src:url('/fonts/SolaimanLipi.woff2') format('woff2'),url('/fonts/SolaimanLipi.ttf') format('truetype');font-display:swap}",
}

/** Load a reader font's CSS on first use. Amiri, Noto Serif Bengali and Hind Siliguri ship with the UI. */
export async function loadFont(key: string) {
  if (loaded.has(key)) return
  loaded.add(key)
  if (LOCAL_FONTS[key]) {
    const style = document.createElement('style')
    style.textContent = LOCAL_FONTS[key]
    document.head.appendChild(style)
    return
  }
  if (key === 'noto-naskh-arabic') {
    await Promise.all([import('@fontsource/noto-naskh-arabic/400.css'), import('@fontsource/noto-naskh-arabic/700.css')])
  } else if (key === 'scheherazade-new') {
    await Promise.all([import('@fontsource/scheherazade-new/400.css'), import('@fontsource/scheherazade-new/700.css')])
  }
}

export function arabicFamily(key: string) {
  return ARABIC_FONTS.find((f) => f.key === key)?.family ?? 'Amiri'
}

export function banglaFamily(key: string) {
  return BANGLA_FONTS.find((f) => f.key === key)?.family ?? 'Noto Serif Bengali'
}

/** CSS variables the reader text reads its font families from. */
export function readerFontVars(fontAr: string, fontBn: string) {
  return {
    '--font-ar': `'${arabicFamily(fontAr)}'`,
    '--font-bn': fontBn === 'hind-siliguri' ? "'Bangla Digits', 'Hind Siliguri'" : `'${banglaFamily(fontBn)}'`,
  } as CSSProperties
}
