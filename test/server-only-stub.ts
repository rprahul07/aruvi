// In tests we import server modules directly (Node environment), so the
// `server-only` guard — which throws when imported outside a Server Component —
// is aliased to this no-op via vitest.config.ts.
export {};
