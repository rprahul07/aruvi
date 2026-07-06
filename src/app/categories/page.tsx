import Link from "next/link";
import Image from "next/image";
import { getAllCategories } from "@/lib/data/catalog";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await getAllCategories();

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl text-ink">Shop by Category</h1>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="group relative flex aspect-square items-end overflow-hidden rounded-lg bg-ink/5"
          >
            {category.imageUrl ? (
              <Image
                src={category.imageUrl}
                alt={category.name}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : null}
            <span className="relative z-10 p-4 font-display text-lg text-ink group-hover:text-gold-deep">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
