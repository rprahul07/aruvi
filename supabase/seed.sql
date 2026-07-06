-- ════════════════════════════════════════════════════════════════════════
-- Local development fixtures. Run automatically by `supabase db reset`.
-- Images are deterministic placeholders (picsum.photos) — swap for real
-- product photography before any real deployment.
-- ════════════════════════════════════════════════════════════════════════

-- ---- categories -----------------------------------------------------------
insert into public.categories (id, name, slug, description, sort_order) values
  ('11111111-1111-1111-a111-111111111101', 'Rings', 'rings', 'Statement and everyday rings.', 1),
  ('11111111-1111-1111-a111-111111111102', 'Earrings', 'earrings', 'Studs, hoops, and drops.', 2),
  ('11111111-1111-1111-a111-111111111103', 'Necklaces', 'necklaces', 'Pendants and chains.', 3),
  ('11111111-1111-1111-a111-111111111104', 'Bangles', 'bangles', 'Bangles and bracelets.', 4)
on conflict (id) do nothing;

-- ---- collections ------------------------------------------------------
insert into public.collections (id, name, slug, description, is_active) values
  ('22222222-2222-2222-a222-222222222201', 'New Arrivals', 'new-arrivals', 'Just landed.', true),
  ('22222222-2222-2222-a222-222222222202', 'Best Sellers', 'best-sellers', 'Customer favourites.', true),
  ('22222222-2222-2222-a222-222222222203', 'Wedding Edit', 'wedding-edit', 'For the big day and beyond.', true)
on conflict (id) do nothing;

-- ---- attributes & values ------------------------------------------------
insert into public.attributes (id, name, slug, sort_order) values
  ('33333333-3333-3333-a333-333333333301', 'Size', 'size', 1),
  ('33333333-3333-3333-a333-333333333302', 'Metal Colour', 'metal-colour', 2)
on conflict (id) do nothing;

insert into public.attribute_values (id, attribute_id, value, slug, sort_order) values
  ('44444444-4444-4444-a444-444444444401', '33333333-3333-3333-a333-333333333301', '6', '6', 1),
  ('44444444-4444-4444-a444-444444444402', '33333333-3333-3333-a333-333333333301', '7', '7', 2),
  ('44444444-4444-4444-a444-444444444403', '33333333-3333-3333-a333-333333333301', '8', '8', 3),
  ('44444444-4444-4444-a444-444444444404', '33333333-3333-3333-a333-333333333302', 'Gold', 'gold', 1),
  ('44444444-4444-4444-a444-444444444405', '33333333-3333-3333-a333-333333333302', 'Rose Gold', 'rose-gold', 2),
  ('44444444-4444-4444-a444-444444444406', '33333333-3333-3333-a333-333333333302', 'Silver', 'silver', 3)
on conflict (id) do nothing;

-- ---- products -------------------------------------------------------------
insert into public.products (
  id, name, slug, sku, short_description, description, category_id, material, metal,
  occasion, style, gender_target, base_price, sale_price, tax_percent, status
) values
  (
    '55555555-5555-5555-a555-555555555501', 'Aurelia Butterfly Ring', 'aurelia-butterfly-ring',
    'RING-AUR-001', 'A delicate gold-plated butterfly ring for everyday wear.',
    'Hand-finished butterfly motif ring in gold-plated brass with cubic zirconia accents. Lightweight enough for daily wear, refined enough for evenings out.',
    '11111111-1111-1111-a111-111111111101', 'Brass, cubic zirconia', 'Gold-plated',
    'Daily wear', 'Minimal', 'women', 2499, 1999, 3, 'active'
  ),
  (
    '55555555-5555-5555-a555-555555555502', 'Meridian Hoop Earrings', 'meridian-hoop-earrings',
    'EAR-MER-001', 'Classic medium hoops in a warm gold finish.',
    'Our most-reached-for hoop — a medium 28mm silhouette in warm gold-plated brass, finished with a secure hinge clasp.',
    '11111111-1111-1111-a111-111111111102', 'Brass', 'Gold-plated',
    'Everyday', 'Classic', 'women', 1799, null, 3, 'active'
  ),
  (
    '55555555-5555-5555-a555-555555555503', 'Solstice Pendant Necklace', 'solstice-pendant-necklace',
    'NCK-SOL-001', 'A sunburst pendant on a fine cable chain.',
    'A sculptural sunburst pendant in gold-plated brass, suspended from an 18-inch fine cable chain with a 2-inch extender.',
    '11111111-1111-1111-a111-111111111103', 'Brass', 'Gold-plated',
    'Gifting', 'Statement', 'women', 3299, 2799, 3, 'active'
  ),
  (
    '55555555-5555-5555-a555-555555555504', 'Vesper Stacking Bangle', 'vesper-stacking-bangle',
    'BNG-VES-001', 'A slim stacking bangle designed to layer.',
    'A slim 4mm stacking bangle in gold-plated brass — designed to be worn alone or layered three-deep.',
    '11111111-1111-1111-a111-111111111104', 'Brass', 'Gold-plated',
    'Daily wear', 'Minimal', 'women', 1499, null, 3, 'active'
  )
on conflict (id) do nothing;

insert into public.product_collections (product_id, collection_id) values
  ('55555555-5555-5555-a555-555555555501', '22222222-2222-2222-a222-222222222201'),
  ('55555555-5555-5555-a555-555555555502', '22222222-2222-2222-a222-222222222202'),
  ('55555555-5555-5555-a555-555555555503', '22222222-2222-2222-a222-222222222203'),
  ('55555555-5555-5555-a555-555555555503', '22222222-2222-2222-a222-222222222201')
on conflict do nothing;

-- ---- variants -------------------------------------------------------------
insert into public.product_variants (id, product_id, sku, price, sale_price, stock_quantity, low_stock_threshold) values
  ('66666666-6666-6666-a666-666666666601', '55555555-5555-5555-a555-555555555501', 'RING-AUR-001-6', 2499, 1999, 12, 3),
  ('66666666-6666-6666-a666-666666666602', '55555555-5555-5555-a555-555555555501', 'RING-AUR-001-7', 2499, 1999, 8, 3),
  ('66666666-6666-6666-a666-666666666603', '55555555-5555-5555-a555-555555555501', 'RING-AUR-001-8', 2499, 1999, 0, 3),
  ('66666666-6666-6666-a666-666666666604', '55555555-5555-5555-a555-555555555502', 'EAR-MER-001-GOLD', 1799, null, 20, 5),
  ('66666666-6666-6666-a666-666666666605', '55555555-5555-5555-a555-555555555502', 'EAR-MER-001-ROSE', 1799, null, 15, 5),
  ('66666666-6666-6666-a666-666666666606', '55555555-5555-5555-a555-555555555503', 'NCK-SOL-001-GOLD', 3299, 2799, 10, 3),
  ('66666666-6666-6666-a666-666666666607', '55555555-5555-5555-a555-555555555504', 'BNG-VES-001-GOLD', 1499, null, 25, 5),
  ('66666666-6666-6666-a666-666666666608', '55555555-5555-5555-a555-555555555504', 'BNG-VES-001-SILVER', 1499, null, 2, 5)
on conflict (id) do nothing;

insert into public.variant_attribute_values (variant_id, attribute_value_id) values
  ('66666666-6666-6666-a666-666666666601', '44444444-4444-4444-a444-444444444401'),
  ('66666666-6666-6666-a666-666666666602', '44444444-4444-4444-a444-444444444402'),
  ('66666666-6666-6666-a666-666666666603', '44444444-4444-4444-a444-444444444403'),
  ('66666666-6666-6666-a666-666666666604', '44444444-4444-4444-a444-444444444404'),
  ('66666666-6666-6666-a666-666666666605', '44444444-4444-4444-a444-444444444405'),
  ('66666666-6666-6666-a666-666666666606', '44444444-4444-4444-a444-444444444404'),
  ('66666666-6666-6666-a666-666666666607', '44444444-4444-4444-a444-444444444404'),
  ('66666666-6666-6666-a666-666666666608', '44444444-4444-4444-a444-444444444406')
on conflict do nothing;

-- ---- product images (placeholder) -------------------------------------
insert into public.product_images (product_id, url, alt_text, sort_order, is_cover) values
  ('55555555-5555-5555-a555-555555555501', 'https://picsum.photos/seed/aurvi-ring-1/1000/1250', 'Aurelia Butterfly Ring', 0, true),
  ('55555555-5555-5555-a555-555555555501', 'https://picsum.photos/seed/aurvi-ring-2/1000/1250', 'Aurelia Butterfly Ring, detail', 1, false),
  ('55555555-5555-5555-a555-555555555502', 'https://picsum.photos/seed/aurvi-earring-1/1000/1250', 'Meridian Hoop Earrings', 0, true),
  ('55555555-5555-5555-a555-555555555503', 'https://picsum.photos/seed/aurvi-necklace-1/1000/1250', 'Solstice Pendant Necklace', 0, true),
  ('55555555-5555-5555-a555-555555555504', 'https://picsum.photos/seed/aurvi-bangle-1/1000/1250', 'Vesper Stacking Bangle', 0, true)
on conflict do nothing;

-- ---- homepage sections --------------------------------------------------
insert into public.homepage_sections (section_type, title, is_enabled, sort_order, config) values
  ('hero', null, true, 0, '{"headline": "For Moments Worth Marking", "subheadline": "New season jewellery", "ctaLabel": "Shop New Arrivals", "ctaHref": "/collections/new-arrivals"}'),
  ('featured_collections', 'Shop by Collection', true, 1, '{"collectionSlugs": ["new-arrivals", "wedding-edit", "best-sellers"]}'),
  ('new_arrivals', 'New Arrivals', true, 2, '{"collectionSlug": "new-arrivals", "limit": 8}'),
  ('best_sellers', 'Best Sellers', true, 3, '{"collectionSlug": "best-sellers", "limit": 8}')
on conflict do nothing;
