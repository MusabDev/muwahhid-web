import { Link } from '@tanstack/react-router'
import { Brand } from '@/components/brand'

export function SiteFooter() {
  return (
    <footer className="mt-24">
      <div className="gold-rule opacity-60" />
      <div className="wood-panel">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <Brand />
            <p className="max-w-sm text-sm leading-relaxed text-wood-foreground/75">
              আলেমদের কিতাব আর দারস এক জায়গায়। আরবি মূল আর বাংলা অনুবাদ পাশাপাশি রেখে বাক্য ধরে ধরে পড়ুন।
            </p>
            <p lang="ar" dir="rtl" className="text-left font-arabic text-lg text-gold">
              طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ
            </p>
          </div>
          <FooterColumn
            title="পড়ুন"
            links={[
              { to: '/library', label: 'লাইব্রেরি' },
              { to: '/authors', label: 'আহলুল ইলম' },
            ]}
          />
          <FooterColumn
            title="আপনার জন্য"
            links={[
              { to: '/my-library', label: 'আমার লাইব্রেরি' },
              { to: '/search', label: 'অনুসন্ধান' },
              { to: '/login', label: 'লগইন / রেজিস্টার' },
            ]}
          />
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-wood-foreground/60">
          © {new Date().getFullYear()} Muwahhid.net
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold tracking-wide text-gold">{title}</h3>
      <ul className="space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="text-wood-foreground/80 hover:text-wood-foreground">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
