import { Link } from '@tanstack/react-router'
import { ArrowUp, Mail } from 'lucide-react'
import { Brand, Wordmark } from '@/components/brand'
import { bnNum } from '@/lib/text'

type FooterLink = { to: string; label: string; search?: Record<string, string> }

const CONTACT_EMAIL = 'musab.almuwahhid@gmail.com'

// lucide dropped brand icons; paths from simple-icons
const SOCIAL_LINKS = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/almuwahhidd',
    path: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@almuwahhidd',
    path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
  {
    label: 'Telegram',
    href: 'https://t.me/muwahhidbn',
    path: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
  },
]

export function SiteFooter() {
  return (
    <footer className="footer-panel relative isolate overflow-hidden">
      <div className="gold-rule opacity-70" />
      <div
        aria-hidden
        className="pattern-tint pointer-events-none absolute inset-0 -z-10 text-gold opacity-[0.07] mask-[linear-gradient(to_bottom,black,transparent_85%)]"
      />
      <Wordmark className="pointer-events-none absolute -right-10 -bottom-16 -z-10 hidden h-72 text-gold/[0.07] md:block" />

      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 py-10 sm:grid-cols-3 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:gap-10 md:py-12">
          <div className="col-span-2 space-y-4 border-b border-gold/10 pb-8 sm:col-span-3 md:col-span-1 md:border-0 md:pb-0">
            <Brand />
            <p className="max-w-sm text-sm leading-relaxed text-wood-foreground/75">
              আলেমদের কিতাব আর দারস এক জায়গায়। আরবি মূল আর বাংলা অনুবাদ পাশাপাশি রেখে বাক্য ধরে ধরে পড়ুন।
            </p>
            <div className="space-y-1">
              <p lang="ar" dir="rtl" className="text-left font-arabic text-lg text-gold">
                طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ
              </p>
              <p className="text-xs text-wood-foreground/65">ইলম অর্জন করা প্রত্যেক মুসলিমের উপর ফরয।</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-1">
              <div className="flex items-center gap-2">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    title={social.label}
                    className="inline-flex size-9 items-center justify-center rounded-full border border-gold/25 text-wood-foreground/75 transition-colors hover:border-gold/60 hover:text-gold"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-4">
                      <path d={social.path} />
                    </svg>
                  </a>
                ))}
              </div>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 text-sm text-wood-foreground/80 transition-colors hover:text-gold"
              >
                <Mail className="size-4" />
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
          <FooterColumn
            title="পড়ুন"
            links={[
              { to: '/library', label: 'লাইব্রেরি' },
              { to: '/books', label: 'কিতাব' },
              { to: '/durus', label: 'দারস' },
              { to: '/authors', label: 'আহলুল ইলম' },
            ]}
          />
          <FooterColumn
            title="আপনার জন্য"
            links={[
              { to: '/my-library', label: 'আমার লাইব্রেরি' },
              { to: '/search', label: 'অনুসন্ধান', search: { q: '' } },
              { to: '/settings', label: 'সেটিংস' },
            ]}
          />
          <FooterColumn
            title="অ্যাকাউন্ট"
            className="hidden sm:block"
            links={[
              { to: '/login', label: 'লগইন' },
              { to: '/register', label: 'রেজিস্টার' },
            ]}
          />
        </div>
      </div>

      <div className="border-t border-gold/15 bg-black/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-xs text-wood-foreground/60 sm:flex-row">
          <p className="text-center text-balance leading-relaxed sm:text-left">© {bnNum(new Date().getFullYear())} এই ওয়েবসাইটের সর্বস্বত্ব আল-মুওয়াহহিদ কর্তৃক সংরক্ষিত।</p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 px-3 py-1.5 text-wood-foreground/75 transition-colors hover:border-gold/60 hover:text-gold"
          >
            <ArrowUp className="size-3.5" />
            উপরে যান
          </button>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, links, className }: { title: string; links: FooterLink[]; className?: string }) {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold tracking-wide text-gold">{title}</h3>
      <div className="mt-2 mb-3 h-0.5 w-10 rounded bg-gold/70 md:mb-4" />
      <ul className="space-y-1 text-sm md:space-y-2.5">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              search={link.search}
              className="group inline-flex items-center gap-2 py-1 text-wood-foreground/80 md:py-0 transition-colors hover:text-gold"
            >
              <span className="size-1.5 rotate-45 bg-gold/40 transition-colors group-hover:bg-gold" />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
