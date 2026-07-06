import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext adapter config for deploying this Next.js app to Cloudflare Workers.
 *
 * No incremental (ISR) cache is configured because every route in this app is
 * dynamic (server-rendered on demand) — there is no static/ISR output to cache.
 * If you later add ISR or `revalidate`, wire up an R2 incremental cache here
 * (see https://opennext.js.org/cloudflare/caching).
 */
export default defineCloudflareConfig();
