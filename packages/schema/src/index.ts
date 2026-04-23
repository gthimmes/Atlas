// @atlas/schema — Zod runtime validators + inferred TS types for the 11
// primitives. Source-of-truth for *shape* is `schema.ts` at the repo root.
// The compile-time test in zod.compat.test-d.ts pins the Zod schemas to
// the TS interfaces; CI fails on drift.
export * from './zod.js';
