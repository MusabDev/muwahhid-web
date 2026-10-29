import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { HighlightText } from '@/components/highlight-text'
import { Spinner } from '@/components/states'
import { api } from '@/lib/api'
import { bnNum } from '@/lib/text'
import type { FootnoteHit, SentenceHit } from '@/lib/types'

export function SearchPanel({ slug, onNavigate }: { slug: string; onNavigate: () => void }) {
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setQ(input.trim()), 350)
    return () => window.clearTimeout(t)
  }, [input])

  const { data, isFetching } = useQuery({
    queryKey: ['book', slug, 'search', q],
    queryFn: () => api<{ sentences: SentenceHit[]; footnotes: FootnoteHit[] }>(`/books/${slug}/search`, { query: { q } }),
    enabled: q.length >= 2,
  })

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-3 -mt-3 bg-card px-3 pt-3 pb-3">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="এই কিতাবে খুঁজুন…"
            className="h-10 w-full rounded-lg border bg-background ps-9 pe-3 text-sm outline-none focus:border-gold"
          />
        </div>
      </div>
      <div className="space-y-2">
        {isFetching && !data && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}
        {data && q.length >= 2 && (
          <>
            <p className="text-xs text-muted-foreground">
              {bnNum(data.sentences.length + data.footnotes.length)}টি ফলাফল
            </p>
            {data.sentences.map((hit) => (
              <Link
                key={hit.sentence_id}
                to="/books/$slug/read/$page"
                params={{ slug, page: String(hit.page_number) }}
                hash={`s-${hit.sentence_id}`}
                onClick={onNavigate}
                className="block rounded-lg border bg-card p-3 text-sm hover:border-gold/60"
              >
                <p lang="ar" dir="rtl" className="font-arabic text-base leading-loose">
                  <HighlightText text={hit.text_ar} query={hit.lang === 'ar' ? q : ''} arabic />
                </p>
                <p className="text-foreground/80">
                  <HighlightText text={hit.text_bn} query={hit.lang === 'bn' ? q : ''} />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">পৃষ্ঠা {bnNum(hit.page_number)}</p>
              </Link>
            ))}
            {data.footnotes.map((hit) => (
              <Link
                key={`fn-${hit.footnote_id}`}
                to="/books/$slug/read/$page"
                params={{ slug, page: String(hit.page_number) }}
                onClick={onNavigate}
                className="block rounded-lg border border-dashed bg-card p-3 text-sm hover:border-gold/60"
              >
                <p lang={hit.lang} dir={hit.lang === 'ar' ? 'rtl' : 'ltr'} className={hit.lang === 'ar' ? 'font-arabic text-base' : ''}>
                  <HighlightText text={hit.text} query={q} arabic={hit.lang === 'ar'} />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  টীকা ({hit.marker}) · পৃষ্ঠা {bnNum(hit.page_number)}
                </p>
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
