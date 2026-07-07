import Link from "next/link";
import Image from "next/image";
import { getHomepageSections } from "@/lib/data/merchandising";
import { getAllCategories, getProductsByCollectionSlug } from "@/lib/data/catalog";
import { ProductCard } from "@/components/product/product-card";
import { buttonVariants } from "@/components/ui/button";

interface HeroConfig {
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

interface CollectionRailConfig {
  collectionSlug?: string;
  limit?: number;
}

export default async function HomePage() {
  const [sections, categories] = await Promise.all([getHomepageSections(), getAllCategories()]);

  return (
    <div>
      {sections.map((section) => {
        if (section.sectionType === "hero") {
          const config = section.config as HeroConfig;
          return (
            <section
              key={section.id}
              className="flex min-h-[70vh] flex-col items-center justify-center bg-surface-dark px-6 text-center text-white"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-gold-light">{config.subheadline}</p>
              <h1 className="mt-4 max-w-2xl font-display text-4xl font-light md:text-6xl">
                {config.headline}
              </h1>
              {config.ctaLabel && config.ctaHref ? (
                <Link
                  href={config.ctaHref}
                  className={buttonVariants({ variant: "gold", size: "lg", className: "mt-8" })}
                >
                  {config.ctaLabel}
                </Link>
              ) : null}
            </section>
          );
        }

        if (section.sectionType === "featured_collections") {
          return (
            <section key={section.id} className="container-page py-14">
              <h2 className="font-display text-2xl text-ink">{section.title}</h2>
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.slug}`}
                    className="group relative flex aspect-square items-end overflow-hidden rounded-lg bg-ink/5 p-4"
                  >
                    {category.imageUrl ? (
                      <>
                        <Image
                          src={category.imageUrl}
                          alt={category.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover transition-transform duration-700 ease-[var(--ease-brand)] group-hover:scale-105"
                        />
                        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/70 to-transparent" />
                      </>
                    ) : null}
                    <span
                      className={`relative font-display text-lg transition-colors ${
                        category.imageUrl ? "text-white" : "text-ink group-hover:text-gold-deep"
                      }`}
                    >
                      {category.name}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        }

        return <CollectionRail key={section.id} title={section.title} config={section.config as CollectionRailConfig} />;
      })}
    </div>
  );
}

async function CollectionRail({ title, config }: { title: string | null; config: CollectionRailConfig }) {
  if (!config.collectionSlug) return null;
  const { products } = await getProductsByCollectionSlug(config.collectionSlug, { limit: config.limit ?? 8 });
  if (products.length === 0) return null;

  return (
    <section className="container-page py-10">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl text-ink">{title}</h2>
        <Link href={`/collections/${config.collectionSlug}`} className="text-xs uppercase tracking-[0.1em] text-gold-deep hover:underline">
          View all
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
