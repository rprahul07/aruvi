import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProductsByCollectionSlug } from "@/lib/data/catalog";
import { ProductCard } from "@/components/product/product-card";
import { SortSelect } from "@/components/product/sort-select";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";

const PAGE_SIZE = 24;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: collection } = await supabase
    .from("collections")
    .select("name, seo_title, seo_description, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!collection) return {};
  return {
    title: collection.seo_title ?? collection.name,
    description: collection.seo_description ?? collection.description ?? undefined,
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const { slug } = await params;
  const { sort = "recommended", page = "1" } = await searchParams;

  const supabase = await createClient();
  const { data: collection } = await supabase
    .from("collections")
    .select("id, name, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!collection) notFound();

  const pageNum = Math.max(1, Number(page) || 1);
  const { products, total } = await getProductsByCollectionSlug(slug, {
    limit: PAGE_SIZE,
    offset: (pageNum - 1) * PAGE_SIZE,
    sort,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">{collection.name}</h1>
          {collection.description ? <p className="mt-1 max-w-xl text-sm text-muted">{collection.description}</p> : null}
        </div>
        <Suspense>
          <SortSelect />
        </Suspense>
      </div>

      {products.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No products here yet"
            description="Check back soon, or explore another collection."
            ctaLabel="Continue shopping"
            ctaHref="/"
          />
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="mt-10 flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/collections/${slug}?sort=${sort}&page=${p}`}
                  className={buttonVariants({
                    variant: p === pageNum ? "primary" : "outline",
                    size: "sm",
                    className: "min-w-11 justify-center",
                  })}
                >
                  {p}
                </Link>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
