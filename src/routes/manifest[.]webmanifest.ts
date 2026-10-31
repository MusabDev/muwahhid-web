import { createFileRoute } from '@tanstack/react-router'
import { textResponse } from '@/lib/xml'

const MANIFEST = {
  "name": "আল-মুওয়াহহিদ — আহলুল ইলমের কিতাব ও দারস",
  "short_name": "আল-মুওয়াহহিদ",
  "description": "আলেমদের কিতাব আর দারস, আরবি ও বাংলা পাশাপাশি রেখে বাক্য ধরে ধরে পড়ুন।",
  "lang": "bn",
  "dir": "ltr",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#f5efe3",
  "theme_color": "#4a2f1c",
  "categories": [
    "books",
    "education"
  ],
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}

/** Web app manifest, served from a route so it always carries its own media type. */
export const Route = createFileRoute('/manifest.webmanifest')({
  server: {
    handlers: {
      GET: () => textResponse(JSON.stringify(MANIFEST), 'application/manifest+json; charset=utf-8', 86400),
    },
  },
})
