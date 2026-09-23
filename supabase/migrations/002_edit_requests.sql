create function public.edit_material_request(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.material_requests; item jsonb; unit_name text;
begin
 select * into r from public.material_requests where id=p_id for update;
 if r.id is null or not (private.can_buy(r.business_id) or (r.requested_by=auth.uid() and private.is_member(r.business_id))) then raise exception 'FORBIDDEN'; end if;
 if r.status not in ('submitted','reviewing') then raise exception 'INVALID_TRANSITION'; end if;
 if jsonb_typeof(p_data->'items')<>'array' or jsonb_array_length(p_data->'items') not between 1 and 50 or length(coalesce(p_data->>'note',''))>1000 then raise exception 'INVALID_ITEMS'; end if;
 delete from public.material_request_items where request_id=p_id;
 for item in select * from jsonb_array_elements(p_data->'items') loop
   select unit into unit_name from public.products where id=(item->>'product_id')::uuid and active;
   if unit_name is null or length(coalesce(item->>'note',''))>500 then raise exception 'INVALID_PRODUCT'; end if;
   insert into public.material_request_items(request_id,product_id,quantity,unit,note) values(p_id,(item->>'product_id')::uuid,(item->>'quantity')::numeric,unit_name,coalesce(item->>'note',''));
 end loop;
 update public.material_requests set status='submitted',note=coalesce(p_data->>'note',''),urgency=p_data->>'urgency' where id=p_id;
 return p_id;
end; $$;
revoke all on function public.edit_material_request(uuid,jsonb) from public,anon;
grant execute on function public.edit_material_request(uuid,jsonb) to authenticated;
