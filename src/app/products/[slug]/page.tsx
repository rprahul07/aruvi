import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/data/catalog";
import { ProductGallery } from "@/components/product/product-gallery";
import { AddToCartPanel } from "@/components/product/add-to-cart-panel";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  return {
    title: product.name,
    description: product.shortDescription ?? product.description ?? undefined,
    openGraph: {
      images: product.coverImage ? [{ url: product.coverImage.url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? product.description ?? undefined,
    image: product.images.map((i) => i.url),
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.salePrice ?? product.basePrice,
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container-page py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          {product.category ? (
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{product.category.name}</p>
          ) : null}
          <h1 className="mt-1 font-display text-3xl text-ink">{product.name}</h1>
          {product.shortDescription ? <p className="mt-2 text-sm text-muted">{product.shortDescription}</p> : null}

          <div className="mt-2 flex gap-2">
            {product.material ? <Badge variant="neutral">{product.material}</Badge> : null}
            {product.occasion ? <Badge variant="accent">{product.occasion}</Badge> : null}
          </div>

          <div className="mt-6">
            <AddToCartPanel product={product} />
          </div>

          {product.description ? (
            <div className="mt-10 border-t border-line pt-6">
              <h2 className="font-display text-lg text-ink">Description</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-ink/80">{product.description}</p>
            </div>
          ) : null}

          {product.careInstructions ? (
            <div className="mt-6">
              <h2 className="font-display text-lg text-ink">Care instructions</h2>
              <p className="mt-2 text-sm text-ink/80">{product.careInstructions}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
