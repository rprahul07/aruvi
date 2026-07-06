"use client";

import * as React from "react";
import Link from "next/link";
import { Search as SearchIcon, X } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductSummary } from "@/types/domain";

const RECENT_SEARCHES_KEY = "aurvi.recent_searches";
const POPULAR_CATEGORIES = [
  { label: "Rings", href: "/category/rings" },
  { label: "Earrings", href: "/category/earrings" },
  { label: "Necklaces", href: "/category/necklaces" },
  { label: "Bangles", href: "/category/bangles" },
];

function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function SearchPage() {
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [cache, setCache] = React.useState<{ key: string; products: ProductSummary[] } | null>(null);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);

  // Client-only read to avoid a hydration mismatch (localStorage is unavailable during SSR).
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentSearches(readRecentSearches());
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  React.useEffect(() => {
    if (debouncedQuery.length < 2) return;
    let cancelled = false;
    fetch(`/api/v1/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setCache({ key: debouncedQuery, products: json.data ?? [] });
        setRecentSearches((prev) => {
          const next = [debouncedQuery, ...prev.filter((s) => s !== debouncedQuery)].slice(0, 6);
          window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
          return next;
        });
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Derived during render — no synchronous setState in the fetch effect.
  const results: ProductSummary[] | null =
    debouncedQuery.length < 2 ? null : cache?.key === debouncedQuery ? cache.products : null;
  const isLoading = debouncedQuery.length >= 2 && cache?.key !== debouncedQuery;

  return (
    <div className="container-page py-8">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for rings, earrings, necklaces…"
          className="min-h-12 w-full rounded-md border border-line bg-surface pl-12 pr-10 text-base text-ink focus:border-gold-deep focus:outline-none focus:ring-1 focus:ring-gold-deep"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {debouncedQuery.length < 2 ? (
        <div className="mt-8">
          {recentSearches.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">Recent searches</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="rounded-full border border-line px-3 py-1.5 text-sm text-ink hover:border-ink"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">Popular categories</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {POPULAR_CATEGORIES.map((c) => (
                <Link key={c.href} href={c.href} className="rounded-full border border-line px-3 py-1.5 text-sm text-ink hover:border-ink">
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : isLoading || results === null ? (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] w-full" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={`No results for "${debouncedQuery}"`}
            description="Try a different search, or explore a category below."
          />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {POPULAR_CATEGORIES.map((c) => (
              <Link key={c.href} href={c.href} className="rounded-full border border-line px-3 py-1.5 text-sm text-ink hover:border-ink">
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
