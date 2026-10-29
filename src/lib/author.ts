import type { Author } from './types'
import { bnNum } from './text'

const CENTURY_BN = ['প্রথম', 'দ্বিতীয়', 'তৃতীয়', 'চতুর্থ', 'পঞ্চম', 'ষষ্ঠ', 'সপ্তম', 'অষ্টম', 'নবম', 'দশম', 'একাদশ', 'দ্বাদশ', 'ত্রয়োদশ', 'চতুর্দশ', 'পঞ্চদশ']
const CENTURY_AR = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر']

/** "মৃ. ৭২৮ হি." for a scholar who has passed away, null for a living one. */
export function deathLabel(author: Pick<Author, 'death_year_ah'>) {
  return author.death_year_ah ? `মৃ. ${bnNum(author.death_year_ah)} হি.` : null
}

export interface Era {
  /** Hijri century of death, or null for contemporary (living) scholars. */
  century: number | null
  key: string
  title_bn: string
  title_ar: string
  authors: Author[]
}

function eraTitles(century: number | null) {
  if (century === null) return { title_bn: 'সমকালীন আলিমগণ', title_ar: 'العلماء المعاصرون' }
  return {
    title_bn: `${CENTURY_BN[century - 1] ?? `${bnNum(century)}তম`} শতাব্দী হিজরি`,
    title_ar: `القرن ${CENTURY_AR[century - 1] ?? century} الهجري`,
  }
}

/** Group authors by the Hijri century they died in, oldest first, with living scholars last. */
export function groupByEra(authors: Author[]): Era[] {
  const eras = new Map<number | null, Author[]>()
  for (const author of authors) {
    const century = author.death_year_ah ? Math.ceil(author.death_year_ah / 100) : null
    eras.set(century, [...(eras.get(century) ?? []), author])
  }

  return [...eras.entries()]
    .sort(([a], [b]) => (a ?? Infinity) - (b ?? Infinity))
    .map(([century, list]) => ({
      century,
      key: century === null ? 'contemporary' : `century-${century}`,
      ...eraTitles(century),
      authors: list.sort((a, b) => (a.death_year_ah ?? 0) - (b.death_year_ah ?? 0) || a.name_bn.localeCompare(b.name_bn, 'bn')),
    }))
}
