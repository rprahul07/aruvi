import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  FolderTree,
} from "lucide-react";
import { getAdminContext } from "@/lib/auth/admin-context";
import { BRAND } from "@/lib/constants/brand";
import { SignOutButton } from "@/app/account/sign-out-button";

const NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, permission: null },
  { label: "Products", href: "/admin/products", icon: Package, permission: "product:read" },
  { label: "Inventory", href: "/admin/inventory", icon: Boxes, permission: "inventory:read" },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart, permission: "order:read" },
  { label: "Categories", href: "/admin/categories", icon: FolderTree, permission: "product:read" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminContext();

  if (!ctx) {
    redirect("/login?next=/admin");
  }

  const visibleNav = NAV.filter((item) => !item.permission || ctx.permissions.has(item.permission));

  return (
    <div className="min-h-screen bg-paper">
      <div className="grid md:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-line bg-surface md:block">
          <div className="sticky top-0 flex h-screen flex-col p-4">
            <Link href="/admin" className="font-display text-xl text-ink">
              {BRAND.name} <span className="text-xs uppercase tracking-widest text-muted">Admin</span>
            </Link>
            <nav className="mt-6 flex flex-1 flex-col gap-1">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink/80 hover:bg-ink/5 hover:text-ink"
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-line pt-4">
              <p className="truncate text-xs text-muted">{ctx.email}</p>
              <p className="mb-3 text-xs text-muted">{ctx.roles.join(", ")}</p>
              <SignOutButton />
            </div>
          </div>
        </aside>

        <div>
          <header className="flex items-center gap-4 border-b border-line bg-surface px-4 py-3 md:hidden">
            <Link href="/admin" className="font-display text-lg text-ink">
              {BRAND.name} Admin
            </Link>
          </header>
          <main className="p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
