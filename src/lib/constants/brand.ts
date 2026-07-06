/**
 * Single source of truth for brand identity.
 * This is a PLACEHOLDER brand created for this build — no trademark search has
 * been done. Swap the values here (and the /public brand assets) before launch;
 * nothing else in the codebase should hardcode the brand name or tagline.
 */
export const BRAND = {
  name: "AURVI",
  legalName: "Aurvi Jewellery",
  tagline: "Adornment, Considered.",
  description:
    "Fine jewellery curated with intention — rings, earrings, necklaces, and bangles for the moments worth marking.",
  domain: "aurvi.example",
  supportEmail: "hello@aurvi.example",
  supportPhone: "+91 90000 00000",
  whatsappNumber: "919000000000",
  social: {
    instagram: "https://instagram.com/aurvi.jewellery",
    facebook: "https://facebook.com/aurvi.jewellery",
  },
} as const;
