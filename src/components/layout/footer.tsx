import Link from "next/link";
import { BRAND } from "@/lib/constants/brand";

// lucide-react does not ship brand/logo icons — small inline glyphs instead.
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.332.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24h11.494v-9.294H9.691v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.464.099 2.795.143v3.24h-1.918c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.407 24 24 23.407 24 22.676V1.325C24 .593 23.407 0 22.675 0z" />
    </svg>
  );
}

const COLUMNS = [
  {
    heading: "Shop",
    links: [
      { label: "Rings", href: "/category/rings" },
      { label: "Earrings", href: "/category/earrings" },
      { label: "Necklaces", href: "/category/necklaces" },
      { label: "Bangles", href: "/category/bangles" },
    ],
  },
  {
    heading: "Help",
    links: [
      { label: "Track your order", href: "/account/orders" },
      { label: "Shipping & returns", href: "/pages/shipping-returns" },
      { label: "Contact us", href: "/pages/contact" },
    ],
  },
  {
    heading: "About",
    links: [
      { label: "Our story", href: "/pages/about" },
      { label: "Care guide", href: "/pages/care-guide" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-surface-dark pb-24 pt-14 text-gold-light md:pb-14">
      <div className="container-page grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl text-white">{BRAND.name}</p>
          <p className="mt-3 max-w-xs text-sm text-gold-light/70">{BRAND.description}</p>
          <div className="mt-5 flex gap-3">
            <a
              href={BRAND.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-light/30 hover:bg-white/5"
            >
              <InstagramIcon className="h-4 w-4" />
            </a>
            <a
              href={BRAND.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-light/30 hover:bg-white/5"
            >
              <FacebookIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-white">{col.heading}</p>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gold-light/70 hover:text-gold-light">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="container-page mt-10 border-t border-gold-light/10 pt-6 text-xs text-gold-light/50">
        © {new Date().getFullYear()} {BRAND.legalName}. All rights reserved.
      </div>
    </footer>
  );
}
