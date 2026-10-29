export type Lang = 'ar' | 'bn'

export type BlockType = 'paragraph' | 'heading' | 'quote' | 'list_item' | 'poetry'

export type BookStatus = 'read_later' | 'reading' | 'on_hold' | 'dropped' | 'completed'

export interface Paginated<T> {
  data: T[]
  meta: { current_page: number; last_page: number; total: number; per_page: number }
  links: { next: string | null; prev: string | null }
}

export interface User {
  id: number
  name: string
  email: string
  is_admin: boolean
}

export interface Author {
  id: number
  slug: string
  name_ar: string
  name_bn: string
  name_translit: string
  about_md: string | null
  books_count?: number
  dars_series_count?: number
  books?: Book[]
  dars_series?: DarsSeries[]
}

export interface TocEntry {
  id: number
  parent_id: number | null
  position: number
  title_ar: string
  title_bn: string
  page_number: number
  sentence_id: number | null
  children?: TocEntry[]
}

export interface Book {
  id: number
  slug: string
  title_ar: string
  title_bn: string
  title_translit: string
  about_md: string | null
  cover_url: string | null
  content_version: number
  is_published: boolean
  pages_count?: number
  first_page?: number | null
  last_page?: number | null
  author?: Author
  toc?: TocEntry[]
  dars_series?: DarsSeries[]
  created_at?: string
}

export interface Sentence {
  id: number
  page_id: number
  position: number
  block_type: BlockType
  paragraph_break: boolean
  text_ar_md: string
  text_bn_md: string
  text_ar_plain: string
  text_bn_plain: string
}

export interface Footnote {
  id: number
  lang: Lang
  marker: string
  text_md: string
}

export interface BookPage {
  id: number
  number: number
  book_id: number
  content_version: number
  sentences: Sentence[]
  footnotes: { ar: Footnote[]; bn: Footnote[] }
  prev_page: number | null
  next_page: number | null
  sentences_count?: number
}

export interface DarsSeries {
  id: number
  slug: string
  title_ar: string
  title_bn: string
  title_translit: string
  about_md: string | null
  is_published: boolean
  book_id: number | null
  durus_count?: number
  author?: Author
  book?: Book | null
  durus?: Dars[]
}

export interface Segment {
  id: number
  position: number
  start_time: number
  end_time: number | null
  text_ar: string
  text_bn: string
}

export interface Dars {
  id: number
  series_id: number
  number: number
  title_ar: string | null
  title_bn: string
  media_type: 'video' | 'audio'
  media_url: string
  duration_seconds: number | null
  segments_count?: number
  series?: DarsSeries
  segments?: Segment[]
  prev_id?: number | null
  next_id?: number | null
}

export interface LibraryEntry {
  book_id: number
  status: BookStatus | null
  last_page: number | null
  last_sentence_id: number | null
  progress: number
  last_read_at: string | null
  book?: Book
}

export type AnnotationTarget = 'book_sentence' | 'dars_segment'

export interface Annotation {
  id: number | string
  target_type: AnnotationTarget
  target_id: number
  book_id: number | null
  dars_id: number | null
  lang: Lang
  start_offset: number
  end_offset: number
  quote: string
  color: string | null
  note: string | null
  created_at?: string
}

export interface Bookmark {
  id: number | string
  book_id: number
  page_number: number
  sentence_id: number | null
  label: string | null
  created_at?: string
  book?: Book
}

export interface BookExport {
  id: number
  variant: 'ar' | 'bn' | 'bilingual'
  status: 'pending' | 'processing' | 'done' | 'failed'
  error: string | null
  download_url: string | null
}

export interface SentenceHit {
  type: 'sentence'
  sentence_id: number
  book_id: number
  book_slug: string
  book_title_ar: string
  book_title_bn: string
  page_number: number
  lang: Lang
  text_ar: string
  text_bn: string
}

export interface FootnoteHit {
  type: 'footnote'
  footnote_id: number
  page_number: number
  lang: Lang
  marker: string
  text: string
}

export interface SegmentHit {
  type: 'segment'
  segment_id: number
  dars_id: number
  dars_number: number
  dars_title_bn: string
  series_slug: string
  start_time: number
  text_ar: string
  text_bn: string
}

export interface GlobalSearchResult {
  query: string
  books: Book[]
  authors: Author[]
  dars_series: DarsSeries[]
  sentences: SentenceHit[]
  segments: SegmentHit[]
}
