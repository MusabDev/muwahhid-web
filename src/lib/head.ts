/** Document title + description for a route's `head`. */
export function pageTitle(title?: string, description?: string | null) {
  const full = title ? `${title} · মুওয়াহহিদ` : 'মুওয়াহহিদ · আলিমদের কিতাব ও দারস আরবি ও বাংলায়'
  return {
    meta: [
      { title: full },
      { property: 'og:title', content: full },
      ...(description ? [{ name: 'description', content: description.slice(0, 160) }, { property: 'og:description', content: description.slice(0, 160) }] : []),
    ],
  }
}
