import { Link } from '@tanstack/react-router'
import { ArrowUp } from 'lucide-react'
import { Brand, StarMark } from '@/components/brand'
import { bnNum } from '@/lib/text'

type FooterLink = { to: string; label: string; search?: Record<string, string> }

export function SiteFooter() {
  return (
    <footer className="footer-panel relative isolate mt-16 overflow-hidden md:mt-24">
      <div className="gold-rule opacity-70" />
      <div
        aria-hidden
        className="pattern-tint pointer-events-none absolute inset-0 -z-10 text-gold opacity-[0.07] mask-[linear-gradient(to_bottom,black,transparent_85%)]"
      />
      <StarMark className="pointer-events-none absolute -right-16 -bottom-20 -z-10 hidden size-80 text-gold/10 md:block" />

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
