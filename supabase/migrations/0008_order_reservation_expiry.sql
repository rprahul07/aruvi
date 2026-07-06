-- ════════════════════════════════════════════════════════════════════════
-- Reservation expiry: stock is reserved when a pending order + Razorpay
-- order are created at checkout. If the customer never completes payment
-- (closes the tab, lets the session go stale), this sweep releases the
-- hold so it doesn't starve other customers indefinitely.
--
-- release_expired_order_reservations() is safe to invoke repeatedly and
-- concurrently — it only touches orders still in payment_status='created'
-- past their expiry. Wire it to a scheduler (pg_cron, or an external cron
-- hitting a protected route) — see README "Operations" section.
-- ════════════════════════════════════════════════════════════════════════

alter table public.orders
  add column reservation_expires_at timestamptz;

create or replace function public.release_expired_order_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item record;
  v_count integer := 0;
begin
  for v_order in
    select id from public.orders
    where payment_status = 'created'
      and reservation_expires_at is not null
      and reservation_expires_at < now()
      and status = 'pending'
    for update skip locked
  loop
    for v_item in
      select variant_id, quantity from public.order_items where order_id = v_order.id and variant_id is not null
    loop
      perform public.release_variant_stock(v_item.variant_id, v_item.quantity, v_order.id);
    end loop;

    update public.orders
    set status = 'cancelled', payment_status = 'failed'
    where id = v_order.id;

    insert into public.order_status_history (order_id, status, note)
    values (v_order.id, 'cancelled', 'Reservation expired before payment was completed');

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
