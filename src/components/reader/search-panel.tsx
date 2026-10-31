import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Search, SearchX, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { HighlightText } from '@/components/highlight-text'
import { Spinner } from '@/components/states'
import { api } from '@/lib/api'
import { bnNum } from '@/lib/text'
import type { FootnoteHit, SentenceHit } from '@/lib/types'
import { cn } from '@/lib/utils'

const MIN_QUERY = 2

/** The box's text is owned by the caller, so a search survives the panel closing. */
export function SearchPanel({ slug, input, onInput: setInput, onNavigate }: { slug: string; input: string; onInput: (value: string) => void; onNavigate: () => void }) {
  const [q, setQ] = useState(input.trim())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setQ(input.trim()), 350)
    return () => window.clearTimeout(t)
  }, [input])

  /* the panel mounts each time search opens */
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
    inputRef.current?.select()
  }, [])

  const { data, isFetching } = useQuery({
    queryKey: ['book', slug, 'search', q],
    queryFn: () => api<{ sentences: SentenceHit[]; footnotes: FootnoteHit[] }>(`/books/${slug}/search`, { query: { q } }),
    enabled: q.length >= MIN_QUERY,
  })

  const searching = q.length >= MIN_QUERY
  const total = data ? data.sentences.length + data.footnotes.length : 0

  return (
    <div>
      <div className="sticky -top-3 z-10 -mx-3 -mt-3 bg-card px-3 pt-3 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="এই কিতাবে সার্চ করুন…"
            className="h-11 w-full rounded-xl border bg-background ps-9 pe-10 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-gold focus:ring-3 focus:ring-gold/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {isFetching ? (
            <span className="absolute end-3 top-1/2 -translate-y-1/2 scale-75">
              <Spinner />
            </span>
          ) : (
            input && (
              <button
                type="button"
                aria-label="মুছে ফেলুন"
                onClick={() => {
                  setInput('')
                  inputRef.current?.focus()
                }}
                className="absolute end-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )
          )}
        </div>
      </div>

      {!searching ? (
        <Hint icon={Search} title="কিতাবের ভেতরে খুঁজুন">
          আরবি বা বাংলায় অন্তত দুটি অক্ষর লিখুন। আরবিতে হরকত না দিলেও খুঁজে পাবেন।
        </Hint>
      ) : !data ? null : total === 0 ? (
        <Hint icon={SearchX} title="কিছু পাওয়া যায়নি">
          “{q}” এই কিতাবে নেই। বানান বদলে বা ছোট শব্দে চেষ্টা করুন।
        </Hint>
      ) : (
        <div className={cn('space-y-5 transition-opacity', isFetching && 'opacity-60')}>
          {data.sentences.length > 0 && (
            <Group title="বাক্য" count={data.sentences.length}>
              {data.sentences.map((hit) => (
                <Link
                  key={hit.sentence_id}
                  to="/books/$slug/read/$page"
                  params={{ slug, page: String(hit.page_number) }}
                  hash={`s-${hit.sentence_id}`}
                  onClick={onNavigate}
                  className="group block rounded-xl border bg-card p-3.5 transition-colors hover:border-gold/50 hover:bg-accent/30"
                >
                  <p lang="ar" dir="rtl" className="font-arabic text-lg leading-loose">
                    <HighlightText text={hit.text_ar} query={hit.lang === 'ar' ? q : ''} arabic />
                  </p>
                  <p className="mt-1 text-[15px] leading-relaxed text-foreground/85">
                    <HighlightText text={hit.text_bn} query={hit.lang === 'bn' ? q : ''} />
                  </p>
                  <PageTag page={hit.page_number} />
                </Link>
              ))}
            </Group>
          )}
          {data.footnotes.length > 0 && (
            <Group title="টীকা" count={data.footnotes.length}>
              {data.footnotes.map((hit) => (
                <Link
                  key={`fn-${hit.footnote_id}`}
                  to="/books/$slug/read/$page"
                  params={{ slug, page: String(hit.page_number) }}
                  onClick={onNavigate}
                  className="block rounded-xl border border-dashed bg-card p-3.5 transition-colors hover:border-gold/50 hover:bg-accent/30"
                >
                  <p lang={hit.lang} dir={hit.lang === 'ar' ? 'rtl' : 'ltr'} className={hit.lang === 'ar' ? 'font-arabic text-lg leading-loose' : 'text-[15px] leading-relaxed'}>
                    <HighlightText text={hit.text} query={q} arabic={hit.lang === 'ar'} />
                  </p>
                  <PageTag page={hit.page_number}>টীকা {hit.marker}</PageTag>
                </Link>
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  )
}

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
        {title}
        <span className="rounded-full bg-foreground/[0.07] px-1.5 tabular-nums">{bnNum(count)}</span>
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function PageTag({ page, children }: { page: number; children?: ReactNode }) {
  return (
    <p className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground">
      <span className="rounded-md bg-foreground/[0.06] px-2 py-0.5 font-medium text-foreground/80 tabular-nums">পৃষ্ঠা {bnNum(page)}</span>
      {children}
    </p>
  )
}

function Hint({ icon: Icon, title, children }: { icon: typeof Search; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 pt-10 pb-6 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-gold/10 text-gold">
        <Icon className="size-5" />
      </span>
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-64 text-sm text-muted-foreground">{children}</p>
    </div>
  )
}
