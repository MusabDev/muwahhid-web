import { createFileRoute } from '@tanstack/react-router'
import { fetchSitemapData } from '@/lib/seo-data'
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_NAME_EN } from '@/lib/site'
import { textResponse } from '@/lib/xml'

/** llms.txt (llmstxt.org): a plain map of the site for AI assistants and answer engines. */
export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: async () => {
        const data = await fetchSitemapData()
        const lines = [
          `# ${SITE_NAME} (${SITE_NAME_EN})`,
          '',
          `> ${SITE_DESCRIPTION} Classical Islamic books (kitab) and lessons (durus) by the scholars, with the Arabic original and a sentence-aligned Bangla translation side by side; durus have synced Arabic/Bangla subtitles and full transcripts.`,
          '',
          '- Every book page has the Arabic text and its Bangla translation sentence by sentence, footnotes in both languages, and a PDF download.',
          `- Reader pages: ${absoluteUrl('/books/{book}/read/{page}')}`,
          `- A dars at a moment: ${absoluteUrl('/durus/{series}/{number}?t=MM:SS')}`,
          '',
          '## Books',
          ...data.books.map((b) => `- [${b.title_bn} — ${b.title_ar}](${absoluteUrl(`/books/${b.slug}`)})${b.author ? `: ${b.author}` : ''}`),
          '',
          '## Dars series',
          ...data.series.map((s) => `- [${s.title_bn}](${absoluteUrl(`/durus/${s.slug}`)})${s.author ? `: ${s.author}` : ''}, ${s.durus.length} durus`),
          '',
          '## Scholars',
          ...data.authors.map((a) => `- [${a.name_bn}](${absoluteUrl(`/authors/${a.slug}`)})`),
          '',
          '## Optional',
          `- [Sitemap](${absoluteUrl('/sitemap.xml')})`,
          `- [RSS: everything new](${absoluteUrl('/rss.xml')})`,
          '',
        ]
        return textResponse(lines.join('\n'), 'text/plain; charset=utf-8')
      },
    },
  },
})
