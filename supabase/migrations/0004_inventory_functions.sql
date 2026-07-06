-- ════════════════════════════════════════════════════════════════════════
-- Atomic inventory operations.
--
-- Reservation uses a single conditional UPDATE (not read-then-write), so
-- concurrent checkouts on the same variant cannot both succeed past
-- available stock — Postgres serializes the row update.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.reserve_variant_stock(
  p_variant_id uuid,
  p_qty integer,
  p_reference_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if p_qty <= 0 then
    raise exception 'quantity must be positive';
  end if;

  update public.product_variants
  set reserved_quantity = reserved_quantity + p_qty
  where id = p_variant_id
    and is_active = true
    and stock_quantity - reserved_quantity >= p_qty;

  get diagnostics v_updated = row_count;

  if v_updated = 1 then
    insert into public.inventory_movements (variant_id, change_quantity, reason, reference_type, reference_id)
    values (p_variant_id, -p_qty, 'order_reserved', 'order', p_reference_id);
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.release_variant_stock(
  p_variant_id uuid,
  p_qty integer,
  p_reference_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_qty <= 0 then
    return;
  end if;

  update public.product_variants
  set reserved_quantity = greatest(0, reserved_quantity - p_qty)
  where id = p_variant_id;

  insert into public.inventory_movements (variant_id, change_quantity, reason, reference_type, reference_id)
  values (p_variant_id, p_qty, 'order_released', 'order', p_reference_id);
end;
$$;

-- Finalizes a sale: permanently removes stock that was reserved.
create or replace function public.commit_variant_stock(
  p_variant_id uuid,
  p_qty integer,
  p_reference_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_qty <= 0 then
    return;
  end if;

  update public.product_variants
  set stock_quantity = greatest(0, stock_quantity - p_qty),
      reserved_quantity = greatest(0, reserved_quantity - p_qty)
  where id = p_variant_id;

  insert into public.inventory_movements (variant_id, change_quantity, reason, reference_type, reference_id)
  values (p_variant_id, -p_qty, 'order_committed', 'order', p_reference_id);
end;
$$;
