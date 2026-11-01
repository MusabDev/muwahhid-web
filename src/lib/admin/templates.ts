/** Import file formats understood by the admin import endpoints (see BookImporter / SeriesImporter). */
export const BOOK_FORMAT = 'muwahhid.book/v1'
export const SERIES_FORMAT = 'muwahhid.series/v1'

export const BOOK_STARTER = {
  format: BOOK_FORMAT,
  book: {
    title_ar: 'كتاب التوحيد',
    title_bn: 'কিতাবুত তাওহীদ',
    title_translit: 'Kitab at-Tawhid',
    slug: null,
    about_md: 'কিতাবের সংক্ষিপ্ত পরিচিতি (Markdown)।',
    is_published: false,
    author: {
      slug: 'muhammad-ibn-abdul-wahhab',
      name_ar: 'محمد بن عبد الوهاب',
      name_bn: 'মুহাম্মাদ ইবনু আব্দিল ওয়াহহাব',
      name_translit: 'Muhammad ibn Abdul Wahhab',
      death_year_ah: 1206,
    },
    explainer: null,
    category: { name_bn: 'আকীদা', name_ar: 'العقيدة', slug: 'aqidah' },
  },
  pages: [
    {
      number: 1,
      sentences: [
        { ar: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ', bn: 'পরম করুণাময় অতি দয়ালু আল্লাহর নামে', block_type: 'heading', paragraph_break: false },
        { ar: 'كِتَابُ التَّوْحِيدِ', bn: 'তাওহীদের অধ্যায়', block_type: 'heading', paragraph_break: false },
        { ar: 'وَقَوْلِ اللَّهِ تَعَالَى: **﴿وَمَا خَلَقْتُ الْجِنَّ وَالْإِنْسَ إِلَّا لِيَعْبُدُونِ﴾**[^1]', bn: 'এবং আল্লাহ তাআলার বাণী: **“আমি জিন ও মানুষকে কেবল আমার ইবাদতের জন্যই সৃষ্টি করেছি।”**[^1]', block_type: 'quote', paragraph_break: true },
      ],
      footnotes: {
        ar: [{ marker: '1', text: 'سورة الذاريات: ٥٦' }],
        bn: [{ marker: '1', text: 'সূরা আয-যারিয়াত: ৫৬' }],
      },
    },
  ],
  toc: [{ title_ar: 'كتاب التوحيد', title_bn: 'তাওহীদের অধ্যায়', page: 1, children: [] }],
}

export const SERIES_STARTER = {
  format: SERIES_FORMAT,
  series: {
    title_ar: 'شرح الأصول الثلاثة',
    title_bn: 'শারহুল উসূলিস সালাসা',
    title_translit: 'Sharh al-Usul ath-Thalatha',
    slug: null,
    about_md: 'সিরিজের সংক্ষিপ্ত পরিচিতি (Markdown)।',
    is_published: false,
    author: 'muhammad-ibn-abdul-wahhab',
    category: 'aqidah',
    book: null,
  },
  durus: [
    {
      number: 1,
      title_bn: 'ভূমিকা',
      title_ar: 'المقدمة',
      media_type: 'video',
      media_url: 'https://www.youtube.com/watch?v=XXXXXXXXXXX',
      duration_seconds: 1800,
      segments: [
        { start: '00:00', end: '00:04.5', ar: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ', bn: 'পরম করুণাময় অতি দয়ালু আল্লাহর নামে' },
        { start: '00:04.5', end: '00:09', ar: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', bn: 'সমস্ত প্রশংসা জগতসমূহের প্রতিপালক আল্লাহর জন্য' },
      ],
    },
    { number: 2, title_bn: 'প্রথম মূলনীতি', title_ar: null, media_type: 'audio', media_url: 'https://example.com/dars-2.mp3', duration_seconds: null, segments: [] },
  ],
}

/** Save data as a pretty-printed .json file in the browser. */
export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

/** Guess the media type from a dars link: audio files are audio, everything else (YouTube, mp4…) video. */
export function guessMediaType(url: string): 'video' | 'audio' | null {
  const path = url.trim().toLowerCase().split(/[?#]/)[0]
  if (!path) return null
  if (/\.(mp3|m4a|aac|ogg|oga|opus|wav|flac)$/.test(path)) return 'audio'
  if (/youtube\.com|youtu\.be|vimeo\.com|\.(mp4|webm|mov|m4v)$/.test(path)) return 'video'
  return null
}
