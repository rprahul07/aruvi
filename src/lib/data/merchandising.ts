import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface HomepageSection {
  id: string;
  sectionType: string;
  title: string | null;
  config: Record<string, unknown>;
}

export async function getHomepageSections(): Promise<HomepageSection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("homepage_sections")
    .select("id, section_type, title, config")
    .eq("is_enabled", true)
    .order("sort_order");

  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    sectionType: row.section_type,
    title: row.title,
    config: (row.config as Record<string, unknown>) ?? {},
  }));
}

export async function getActiveAnnouncement(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("banners")
    .select("title")
    .eq("position", "announcement")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.title ?? null;
}
