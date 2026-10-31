import { createFileRoute } from '@tanstack/react-router'
import { IS_PRODUCTION_SITE, SITE_URL } from '@/lib/site'
import { textResponse } from '@/lib/xml'

/** Only the real domain is crawlable; staging and preview deployments ask every bot to stay out. */
export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        textResponse(
          IS_PRODUCTION_SITE
            ? [
                'User-agent: *',
                'Allow: /',
                // account, search and login pages carry noindex instead, which bots can only see if they may fetch them
                'Disallow: /admin',
                // a sorted list is the same list
                'Disallow: /*?*sort=',
                '',
                `Sitemap: ${SITE_URL}/sitemap.xml`,
                '',
              ].join('\n')
            : 'User-agent: *\nDisallow: /\n',
          'text/plain; charset=utf-8',
        ),
    },
  },
})
