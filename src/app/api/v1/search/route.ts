import { z } from "zod";
import { searchProducts } from "@/lib/data/search";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";

const querySchema = z.object({ q: z.string().min(1) });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { q } = querySchema.parse({ q: searchParams.get("q") ?? "" });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const products = await searchProducts(q, { userId: user?.id ?? null });
    return apiSuccess(products);
  } catch (error) {
    return apiError(error);
  }
}
