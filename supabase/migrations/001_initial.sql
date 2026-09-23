-- Sefaresh: integer toman prices, tenant isolation, atomic purchasing workflows.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', phone text not null default '',
  role text not null default 'employee' check (role in ('owner','manager','buyer','employee','supplier','admin')),
  supplier_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.businesses (
  id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 2 and 120),
  type text not null, city text not null default 'کرمان', area text not null, address text not null default '', phone text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.business_members (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  user_id uuid not null references public.profiles(id), role text not null check (role in ('owner','manager','buyer','employee')),
  created_at timestamptz not null default now(), unique (business_id,user_id), unique(user_id)
);
create table public.categories (id uuid primary key default gen_random_uuid(), name text not null unique);
create table public.products (
  id uuid primary key default gen_random_uuid(), name text not null check (length(name)>1), category_id uuid not null references public.categories(id),
  brand text not null default '', unit text not null, package_size numeric not null default 1 check (package_size>0),
  description text not null default '', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.suppliers (
  id uuid primary key default gen_random_uuid(), name text not null, contact_person text not null default '', phone text not null default '', whatsapp text not null default '',
  address text not null default '', service_area text not null default 'کرمان', minimum_order bigint not null default 0 check (minimum_order>=0),
  delivery_hours integer not null default 24 check (delivery_hours>0), delivery_fee bigint not null default 0 check (delivery_fee>=0),
  active boolean not null default true, notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.profiles add constraint profiles_supplier_fkey foreign key (supplier_id) references public.suppliers(id);
create table public.supplier_products (
  id uuid primary key default gen_random_uuid(), supplier_id uuid not null references public.suppliers(id), product_id uuid not null references public.products(id),
  created_at timestamptz not null default now(), unique(supplier_id,product_id)
);
create table public.supplier_offers (
  id uuid primary key default gen_random_uuid(), supplier_id uuid not null references public.suppliers(id), product_id uuid not null references public.products(id),
  price bigint not null check (price>0 and price<=100000000000), previous_price bigint,
  unit text not null, package_size numeric not null default 1 check (package_size>0), minimum_quantity numeric not null default 1 check (minimum_quantity>0),
  available boolean not null default true, delivery_fee bigint not null default 0 check (delivery_fee>=0), delivery_hours integer not null default 24 check (delivery_hours>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(supplier_id,product_id)
);
create table public.material_requests (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id), requested_by uuid not null references public.profiles(id),
  urgency text not null default 'normal' check (urgency in ('normal','urgent')),
  status text not null default 'submitted' check (status in ('submitted','reviewing','approved','rejected','in_basket','purchased')),
  note text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.material_request_items (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.material_requests(id), product_id uuid not null references public.products(id),
  quantity numeric not null check (quantity>0 and quantity<=100000), unit text not null, note text not null default '', created_at timestamptz not null default now()
);
create table public.procurement_baskets (
  id uuid primary key default gen_random_uuid(), business_id uuid not null unique references public.businesses(id), note text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.basket_items (
  id uuid primary key default gen_random_uuid(), basket_id uuid not null references public.procurement_baskets(id), product_id uuid not null references public.products(id),
  quantity numeric not null check (quantity>0 and quantity<=100000), note text not null default '', request_item_id uuid unique references public.material_request_items(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.orders (
  id uuid primary key default gen_random_uuid(), number bigint generated always as identity (start with 1041) unique,
  business_id uuid not null references public.businesses(id), supplier_id uuid not null references public.suppliers(id), created_by uuid not null references public.profiles(id),
  checkout_id uuid not null, status text not null default 'submitted' check (status in ('submitted','reviewing','confirmed','preparing','shipped','delivered','cancelled')),
  subtotal bigint not null check (subtotal>=0), delivery_fee bigint not null check (delivery_fee>=0), total bigint not null check (total=subtotal+delivery_fee),
  delivery_hours integer not null, note text not null default '', address text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(checkout_id,supplier_id)
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), product_id uuid not null references public.products(id),
  request_item_id uuid unique references public.material_request_items(id), product_name text not null, quantity numeric not null check (quantity>0), unit text not null,
  unit_price numeric not null check (unit_price>0), total bigint not null check (total>0), offer_updated_at timestamptz not null, note text not null default '', created_at timestamptz not null default now()
);
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), status text not null,
  actor uuid not null references public.profiles(id), actor_name text not null, note text not null default '', created_at timestamptz not null default now()
);

create index members_business on public.business_members(business_id);
create index requests_business_status on public.material_requests(business_id,status,created_at desc);
create index request_items_request on public.material_request_items(request_id);
create index baskets_items_basket on public.basket_items(basket_id);
create index offers_product on public.supplier_offers(product_id);
create index orders_business_date on public.orders(business_id,created_at desc);
create index orders_supplier_status on public.orders(supplier_id,status);
create index items_order on public.order_items(order_id);
create index history_order on public.order_status_history(order_id,created_at);

create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
create function private.has_role(b uuid, roles text[]) returns boolean language sql stable security definer set search_path='' as $$
  select private.is_admin() or exists(select 1 from public.business_members where business_id=b and user_id=auth.uid() and role=any(roles));
$$;
create function private.is_member(b uuid) returns boolean language sql stable security definer set search_path='' as $$
  select private.has_role(b,array['owner','manager','buyer','employee']);
$$;
create function private.can_buy(b uuid) returns boolean language sql stable security definer set search_path='' as $$
  select private.has_role(b,array['owner','manager','buyer']);
$$;
create function private.owns_supplier(s uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='supplier' and supplier_id=s);
$$;
create function private.can_view_request(r uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.material_requests where id=r and (private.can_buy(business_id) or (requested_by=auth.uid() and private.is_member(business_id))));
$$;
create function private.can_view_order(o uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.orders where id=o and (private.can_buy(business_id) or private.owns_supplier(supplier_id)));
$$;
create function private.new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.new_user();
create function private.touch() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end; $$;
create function private.offer_history() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.price<>old.price then new.previous_price=old.price; end if;
 new.updated_at=now();
 insert into public.supplier_products(supplier_id,product_id) values(new.supplier_id,new.product_id) on conflict do nothing;
 return new;
end; $$;
create trigger offer_history before insert or update on public.supplier_offers for each row execute function private.offer_history();

do $$ declare t text; begin
 foreach t in array array['profiles','businesses','products','suppliers','material_requests','procurement_baskets','basket_items','orders'] loop
   execute format('create trigger touch_updated before update on public.%I for each row execute function private.touch()',t);
 end loop;
 foreach t in array array['profiles','businesses','business_members','categories','products','suppliers','supplier_products','supplier_offers','material_requests','material_request_items','procurement_baskets','basket_items','orders','order_items','order_status_history'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on public.%I from anon, authenticated',t);
   execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or private.is_admin() or exists(select 1 from public.business_members m where m.user_id=profiles.id and private.is_member(m.business_id)));
create policy businesses_read on public.businesses for select to authenticated using(private.is_member(id));
create policy members_read on public.business_members for select to authenticated using(private.is_member(business_id));
create policy categories_read on public.categories for select to authenticated using(true);
create policy products_read on public.products for select to authenticated using(true);
create policy suppliers_read on public.suppliers for select to authenticated using(true);
create policy supplier_products_read on public.supplier_products for select to authenticated using(true);
create policy offers_read on public.supplier_offers for select to authenticated using(true);
create policy requests_read on public.material_requests for select to authenticated using(private.can_view_request(id));
create policy request_items_read on public.material_request_items for select to authenticated using(private.can_view_request(request_id));
create policy baskets_read on public.procurement_baskets for select to authenticated using(private.can_buy(business_id));
create policy basket_items_read on public.basket_items for select to authenticated using(exists(select 1 from public.procurement_baskets b where b.id=basket_id and private.can_buy(b.business_id)));
create policy orders_read on public.orders for select to authenticated using(private.can_view_order(id));
create policy order_items_read on public.order_items for select to authenticated using(private.can_view_order(order_id));
create policy status_history_read on public.order_status_history for select to authenticated using(private.can_view_order(order_id));
do $$ declare t text; begin
 foreach t in array array['categories','products','suppliers','supplier_offers'] loop
   execute format('grant insert, update on public.%I to authenticated',t);
   execute format('create policy admin_insert on public.%I for insert to authenticated with check(private.is_admin())',t);
   execute format('create policy admin_update on public.%I for update to authenticated using(private.is_admin()) with check(private.is_admin())',t);
 end loop;
end $$;

create function public.onboard_business(p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare b uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 if exists(select 1 from public.business_members where user_id=auth.uid()) then raise exception 'ALREADY_ONBOARDED'; end if;
 if length(trim(p_data->>'name'))<2 or length(trim(p_data->>'full_name'))<2 or not (p_data->>'phone' ~ '^0[0-9]{10}$') or length(trim(p_data->>'area'))<2 then raise exception 'INVALID_BUSINESS'; end if;
 insert into public.businesses(name,type,phone,city,area,address) values(p_data->>'name',p_data->>'type',p_data->>'phone',coalesce(p_data->>'city','کرمان'),p_data->>'area',coalesce(p_data->>'address','')) returning id into b;
 insert into public.business_members(business_id,user_id,role) values(b,auth.uid(),'owner');
 update public.profiles set full_name=p_data->>'full_name',phone=p_data->>'phone' where id=auth.uid();
 insert into public.procurement_baskets(business_id) values(b);
 return b;
end; $$;
create function public.update_business(p_business_id uuid,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role(p_business_id,array['owner','manager']) then raise exception 'FORBIDDEN'; end if;
 if length(trim(p_data->>'name'))<2 or not (p_data->>'phone' ~ '^0[0-9]{10}$') then raise exception 'INVALID_BUSINESS'; end if;
 update public.businesses set name=p_data->>'name',type=p_data->>'type',phone=p_data->>'phone',city=p_data->>'city',area=p_data->>'area',address=p_data->>'address' where id=p_business_id;
 update public.profiles set full_name=p_data->>'full_name',phone=p_data->>'phone' where id=auth.uid();
end; $$;
create function public.manage_member(p_business_id uuid,p_user_id uuid,p_role text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role(p_business_id,array['owner']) then raise exception 'FORBIDDEN'; end if;
 if p_role not in ('manager','buyer','employee') then raise exception 'INVALID_ROLE'; end if;
 if exists(select 1 from public.business_members where user_id=p_user_id and (role='owner' or business_id<>p_business_id)) then raise exception 'MEMBER_PROTECTED'; end if;
 if not private.is_admin() and not exists(select 1 from public.business_members where user_id=p_user_id and business_id=p_business_id) then raise exception 'ADMIN_MUST_ADD_MEMBER'; end if;
 insert into public.business_members(business_id,user_id,role) values(p_business_id,p_user_id,p_role) on conflict(business_id,user_id) do update set role=excluded.role;
end; $$;
create function public.create_material_request(p_business_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare r uuid; item jsonb; unit_name text;
begin
 if not private.is_member(p_business_id) then raise exception 'FORBIDDEN'; end if;
 if jsonb_typeof(p_data->'items')<>'array' or jsonb_array_length(p_data->'items') not between 1 and 50 then raise exception 'INVALID_ITEMS'; end if;
 if length(coalesce(p_data->>'note',''))>1000 then raise exception 'INVALID_NOTE'; end if;
 insert into public.material_requests(business_id,requested_by,urgency,note) values(p_business_id,auth.uid(),p_data->>'urgency',coalesce(p_data->>'note','')) returning id into r;
 for item in select * from jsonb_array_elements(p_data->'items') loop
   select unit into unit_name from public.products where id=(item->>'product_id')::uuid and active;
   if unit_name is null or length(coalesce(item->>'note',''))>500 then raise exception 'INVALID_PRODUCT'; end if;
   insert into public.material_request_items(request_id,product_id,quantity,unit,note) values(r,(item->>'product_id')::uuid,(item->>'quantity')::numeric,unit_name,coalesce(item->>'note',''));
 end loop;
 return r;
end; $$;
create function public.review_request(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare r public.material_requests;
begin
 select * into r from public.material_requests where id=p_id for update;
 if r.id is null or not private.can_buy(r.business_id) then raise exception 'FORBIDDEN'; end if;
 if r.status not in ('submitted','reviewing') or p_status not in ('reviewing','approved','rejected') then raise exception 'INVALID_TRANSITION'; end if;
 update public.material_requests set status=p_status where id=p_id;
end; $$;
create function private.refresh_requests(b uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.material_requests r set status=case
   when not exists(select 1 from public.material_request_items i where i.request_id=r.id and not exists(select 1 from public.order_items oi where oi.request_item_id=i.id)) then 'purchased'
   when exists(select 1 from public.material_request_items i join public.basket_items bi on bi.request_item_id=i.id where i.request_id=r.id) then 'in_basket'
   else 'approved' end
 where r.business_id=b and r.status in ('approved','in_basket');
end; $$;
create function public.add_request_to_basket(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.material_requests; b uuid;
begin
 select * into r from public.material_requests where id=p_id for update;
 if r.id is null or not private.can_buy(r.business_id) then raise exception 'FORBIDDEN'; end if;
 if r.status not in ('approved','in_basket') then raise exception 'REQUEST_NOT_APPROVED'; end if;
 select id into b from public.procurement_baskets where business_id=r.business_id for update;
 insert into public.basket_items(basket_id,product_id,quantity,note,request_item_id)
 select b,i.product_id,i.quantity,i.note,i.id from public.material_request_items i where i.request_id=r.id
 and not exists(select 1 from public.order_items oi where oi.request_item_id=i.id) on conflict(request_item_id) do nothing;
 update public.procurement_baskets set updated_at=now() where id=b;
 perform private.refresh_requests(r.business_id);
end; $$;
create function public.edit_basket(p_business_id uuid,p_action text,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare b uuid;
begin
 if not private.can_buy(p_business_id) then raise exception 'FORBIDDEN'; end if;
 select id into b from public.procurement_baskets where business_id=p_business_id for update;
 if b is null then raise exception 'BASKET_NOT_FOUND'; end if;
 if p_action='add' then
   if not exists(select 1 from public.products where id=(p_data->>'product_id')::uuid and active) then raise exception 'INVALID_PRODUCT'; end if;
   insert into public.basket_items(basket_id,product_id,quantity,note) values(b,(p_data->>'product_id')::uuid,(p_data->>'quantity')::numeric,coalesce(p_data->>'note',''));
 elsif p_action='update' then
   update public.basket_items set quantity=(p_data->>'quantity')::numeric,note=coalesce(p_data->>'note','') where id=(p_data->>'id')::uuid and basket_id=b;
 elsif p_action='remove' then
   delete from public.basket_items where id=(p_data->>'id')::uuid and basket_id=b;
 elsif p_action='note' then
   update public.procurement_baskets set note=left(coalesce(p_data->>'note',''),1000) where id=b;
 else raise exception 'INVALID_ACTION'; end if;
 update public.procurement_baskets set updated_at=now() where id=b;
 perform private.refresh_requests(p_business_id);
end; $$;

create function public.checkout(p_business_id uuid,p_selections jsonb,p_expected_total bigint,p_basket_updated_at timestamptz,p_checkout_id uuid,p_note text,p_address text)
returns uuid[] language plpgsql security definer set search_path='' as $$
declare b public.procurement_baskets; sel jsonb; line record; s record; oid uuid; ids uuid[]='{}'; subtotal_sum bigint; shipping bigint; hours integer; full_total bigint=0;
begin
 if not private.can_buy(p_business_id) then raise exception 'FORBIDDEN'; end if;
 select * into b from public.procurement_baskets where business_id=p_business_id for update;
 if exists(select 1 from public.orders where checkout_id=p_checkout_id and business_id=p_business_id and created_by=auth.uid()) then
   return array(select id from public.orders where checkout_id=p_checkout_id and business_id=p_business_id and created_by=auth.uid());
 end if;
 if b.id is null or b.updated_at<>p_basket_updated_at then raise exception 'BASKET_CHANGED'; end if;
 if length(trim(p_address))<5 or length(p_address)>500 or length(p_note)>1000 then raise exception 'INVALID_ADDRESS'; end if;
 if jsonb_typeof(p_selections)<>'array' or jsonb_array_length(p_selections)=0 or jsonb_array_length(p_selections)<>(select count(*) from public.basket_items where basket_id=b.id)
 or (select count(distinct x->>'basket_item_id') from jsonb_array_elements(p_selections) x)<>jsonb_array_length(p_selections) then raise exception 'INVALID_SELECTION'; end if;
 -- Lock catalog rows so a price/availability change cannot race the reviewed checkout.
 perform 1 from public.supplier_offers o where o.id in (select (x->>'offer_id')::uuid from jsonb_array_elements(p_selections) x) order by o.id for share;
 perform 1 from public.suppliers where id in(select o.supplier_id from public.supplier_offers o where o.id in(select (x->>'offer_id')::uuid from jsonb_array_elements(p_selections) x)) order by id for share;
 perform 1 from public.products where id in(select product_id from public.basket_items where basket_id=b.id) order by id for share;
 for sel in select * from jsonb_array_elements(p_selections) loop
   select bi.*,o.price,o.package_size,o.minimum_quantity,o.unit as offer_unit,o.available,o.updated_at as offer_time,p.unit,p.active,sp1.active as supplier_active
   into line from public.basket_items bi join public.products p on p.id=bi.product_id
   join public.supplier_offers o on o.id=(sel->>'offer_id')::uuid and o.product_id=bi.product_id
   join public.suppliers sp1 on sp1.id=o.supplier_id where bi.id=(sel->>'basket_item_id')::uuid and bi.basket_id=b.id;
   if not found then raise exception 'INVALID_SELECTION'; end if;
   if not line.available or not line.active or not line.supplier_active or line.unit<>line.offer_unit or line.quantity<line.minimum_quantity or mod(line.quantity,line.package_size)<>0 then raise exception 'OFFER_UNAVAILABLE'; end if;
   if (sel->>'updated_at') is null or line.offer_time<>(sel->>'updated_at')::timestamptz then raise exception 'PRICE_CHANGED'; end if;
 end loop;
 for s in select distinct sp.* from public.suppliers sp join public.supplier_offers o on o.supplier_id=sp.id join jsonb_array_elements(p_selections) x on o.id=(x->>'offer_id')::uuid loop
   select sum(round(bi.quantity/o.package_size*o.price)),greatest(s.delivery_fee,max(o.delivery_fee)),greatest(s.delivery_hours,max(o.delivery_hours))
   into subtotal_sum,shipping,hours from jsonb_array_elements(p_selections) x join public.basket_items bi on bi.id=(x->>'basket_item_id')::uuid
   join public.supplier_offers o on o.id=(x->>'offer_id')::uuid where o.supplier_id=s.id;
   if subtotal_sum<s.minimum_order then raise exception 'MINIMUM_ORDER'; end if;
   full_total=full_total+subtotal_sum+shipping;
   insert into public.orders(business_id,supplier_id,created_by,checkout_id,subtotal,delivery_fee,total,delivery_hours,note,address)
   values(p_business_id,s.id,auth.uid(),p_checkout_id,subtotal_sum,shipping,subtotal_sum+shipping,hours,p_note,p_address) returning id into oid;
   ids=array_append(ids,oid);
   insert into public.order_items(order_id,product_id,request_item_id,product_name,quantity,unit,unit_price,total,offer_updated_at,note)
   select oid,bi.product_id,bi.request_item_id,p.name,bi.quantity,p.unit,o.price/o.package_size,round(bi.quantity/o.package_size*o.price),o.updated_at,bi.note
   from jsonb_array_elements(p_selections) x join public.basket_items bi on bi.id=(x->>'basket_item_id')::uuid join public.products p on p.id=bi.product_id
   join public.supplier_offers o on o.id=(x->>'offer_id')::uuid where o.supplier_id=s.id;
   insert into public.order_status_history(order_id,status,actor,actor_name,note) select oid,'submitted',auth.uid(),full_name,'سفارش ثبت شد؛ منتظر بررسی تأمین‌کننده.' from public.profiles where id=auth.uid();
 end loop;
 if full_total<>p_expected_total then raise exception 'PRICE_CHANGED'; end if;
 delete from public.basket_items where basket_id=b.id;
 update public.procurement_baskets set note='',updated_at=now() where id=b.id;
 perform private.refresh_requests(p_business_id);
 return ids;
end; $$;
create function public.change_order_status(p_id uuid,p_status text,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare o public.orders; steps text[]=array['submitted','reviewing','confirmed','preparing','shipped','delivered'];
begin
 select * into o from public.orders where id=p_id for update;
 if o.id is null or not (private.is_admin() or private.owns_supplier(o.supplier_id)) then raise exception 'FORBIDDEN'; end if;
 if o.status in ('delivered','cancelled') or not(p_status=steps[array_position(steps,o.status)+1] or (p_status='cancelled' and o.status<>'shipped')) then raise exception 'INVALID_TRANSITION'; end if;
 if p_status='cancelled' and length(trim(p_note))<3 then raise exception 'CANCELLATION_NOTE_REQUIRED'; end if;
 update public.orders set status=p_status where id=p_id;
 insert into public.order_status_history(order_id,status,actor,actor_name,note) select p_id,p_status,auth.uid(),full_name,left(p_note,1000) from public.profiles where id=auth.uid();
end; $$;

-- No anonymous execution or accidental SECURITY DEFINER surface.
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_admin(),private.has_role(uuid,text[]),private.is_member(uuid),private.can_buy(uuid),private.owns_supplier(uuid),private.can_view_request(uuid),private.can_view_order(uuid) to authenticated;
revoke all on function public.onboard_business(jsonb),public.update_business(uuid,jsonb),public.manage_member(uuid,uuid,text),public.create_material_request(uuid,jsonb),public.review_request(uuid,text),public.add_request_to_basket(uuid),public.edit_basket(uuid,text,jsonb),public.checkout(uuid,jsonb,bigint,timestamptz,uuid,text,text),public.change_order_status(uuid,text,text) from public,anon;
grant execute on function public.onboard_business(jsonb),public.update_business(uuid,jsonb),public.manage_member(uuid,uuid,text),public.create_material_request(uuid,jsonb),public.review_request(uuid,text),public.add_request_to_basket(uuid),public.edit_basket(uuid,text,jsonb),public.checkout(uuid,jsonb,bigint,timestamptz,uuid,text,text),public.change_order_status(uuid,text,text) to authenticated;
