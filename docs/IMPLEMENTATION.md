# Sefaresh MVP implementation

The supplied build brief defines the product. The latest UX polish request makes `Sefaresh_Brand_Identity_final-FA.pdf` the primary design reference for palette, typography, tone, mascot use and UX principles. The three approved identity images remain the reference for exact visual treatments and the unchanged Rosha mascot. Suggested future business actions in the PDF are context, not execution instructions.

No existing repository or application was present. Original brand files are preserved.

1. Read the product brief and inspect all three approved identity images; preserve the supplied Rosha artwork and exact reference palette.
2. Build a Next.js App Router application with TypeScript, responsive RTL, Vazirmatn, and reusable components.
3. Define relational Supabase schema, indexes, tenant RLS, role helpers, atomic onboarding/request/checkout/status RPCs and demo seeds.
4. Implement Supabase email authentication and protected routes. The user explicitly chose local demo first; demo is browser-local, labeled, and never presented as secure production authentication.
5. Implement requests, catalog, basket, supplier comparison, reviewed checkout, audit timeline, history, profiles and operational admin.
6. Validate domain logic, database/RLS, desktop/mobile critical journeys, lint, types and production build.

MVP decisions: one active business per account; manual supplier administration; one supplier per order, with explicit per-item supplier selections creating multiple orders atomically; integer toman prices; catalog units are canonical; prices are indicative until supplier confirmation; delivery fee is charged once per supplier (maximum applicable supplier/offer fee); no payments or supplier notifications are sent.

Visual references retained with the brand book:

- `Codex Image Sep 18, 2026, 03_05_13 PM.png` — visual identity kit.
- `Codex Image Sep 18, 2026, 03_04_49 PM.png` — component and application examples.
- `Codex Image Sep 17, 2026, 06_09_54 PM.png` — official Rosha mascot, copied unchanged to `public/rosha.png`.

Brand-book palette: primary #2457D6; navy #142B4A; pale blue #EAF2FF; amber #FFAD33; canvas #F5F7FA; text #202B3C; secondary #58677C; border #D9E2EE; white #FFFFFF. Status success/error colors are functional exceptions. `brand.css` applies the brand palette, type scale and restrained mascot treatment. The convergence-arrow motif follows the approved image geometry; the Persian name uses Vazirmatn because no separate production vector wordmark was supplied. The September UX pass improved landing CTAs, dashboard next steps and metrics, mobile forms, and shared typography without changing product workflows.

The optimizer examines whole-basket and split assignments, including per-supplier minimums and delivery charges. Search is bounded at 200,000 nodes, with an explicit qualification if interrupted; it never claims guaranteed savings. No stock imagery or generated replacement mascot is used.
