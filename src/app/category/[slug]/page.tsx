import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getProductsByCategorySlug } from "@/lib/data/catalog";
import { ProductCard } from "@/components/product/product-card";
import { SortSelect } from "@/components/product/sort-select";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

const PAGE_SIZE = 24;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("name, seo_title, seo_description, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!category) return {};
  return {
    title: category.seo_title ?? category.name,
    description: category.seo_description ?? category.description ?? undefined,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const { slug } = await params;
  const { sort = "recommended", page = "1" } = await searchParams;

  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("id, name, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!category) notFound();

  const pageNum = Math.max(1, Number(page) || 1);
  const { products, total } = await getProductsByCategorySlug(slug, {
    limit: PAGE_SIZE,
    offset: (pageNum - 1) * PAGE_SIZE,
    sort,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">{category.name}</h1>
          {category.description ? <p className="mt-1 max-w-xl text-sm text-muted">{category.description}</p> : null}
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
                  href={`/category/${slug}?sort=${sort}&page=${p}`}
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
