import { getActiveAnnouncement } from "@/lib/data/merchandising";
import { BRAND } from "@/lib/constants/brand";

export async function AnnouncementBar() {
  const message = await getActiveAnnouncement().catch(() => null);

  return (
    <div className="bg-surface-dark py-2 text-center text-xs tracking-[0.08em] text-gold-light">
      {message ?? `Free shipping across India · ${BRAND.name}`}
    </div>
  );
}
