import { z } from "zod";
import { getProductsByIds } from "@/lib/data/catalog";
import { apiError, apiSuccess } from "@/lib/api/response";

const querySchema = z.object({ ids: z.string().min(1) });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { ids } = querySchema.parse({ ids: searchParams.get("ids") ?? "" });
    const idList = ids.split(",").filter(Boolean).slice(0, 100);
    const products = await getProductsByIds(idList);
    return apiSuccess(products);
  } catch (error) {
    return apiError(error);
  }
}
