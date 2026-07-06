import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const supabaseHostname = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : undefined;
  } catch {
    return undefined;
  }
})();

// On Cloudflare Workers, Next's built-in image optimizer (sharp) is not
// available. Serve images unoptimized there and let Cloudflare's CDN / image
// resizing handle delivery. Locally and on Node hosts, keep optimization on.
const isCloudflare = process.env.CF_PAGES === "1" || process.env.OPEN_NEXT_CLOUDFLARE === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: isCloudflare,
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      // Placeholder imagery for local/dev seed data only.
      // Remove once real product photography is uploaded to Supabase Storage.
      {
        protocol: "https" as const,
        hostname: "picsum.photos",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

// Enables Cloudflare bindings during local `next dev`; no-ops during a build
// and outside the Cloudflare adapter, so it's safe on Node/Vercel too.
initOpenNextCloudflareForDev();

export default nextConfig;
