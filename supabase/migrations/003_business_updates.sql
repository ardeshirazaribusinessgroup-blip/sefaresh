-- Administrative business edits must never overwrite the administrator profile.
create or replace function public.update_business(p_business_id uuid,p_data jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role(p_business_id,array['owner','manager']) then raise exception 'FORBIDDEN'; end if;
 if coalesce(length(trim(p_data->>'name')),0)<2
    or not coalesce(p_data->>'phone' ~ '^0[0-9]{10}$',false)
    or coalesce(length(trim(p_data->>'city')),0)<2
    or coalesce(length(trim(p_data->>'area')),0)<2 then raise exception 'INVALID_BUSINESS'; end if;
 if not private.is_admin() and coalesce(length(trim(p_data->>'full_name')),0)<2 then raise exception 'INVALID_BUSINESS'; end if;
 update public.businesses set name=p_data->>'name',type=p_data->>'type',phone=p_data->>'phone',city=p_data->>'city',area=p_data->>'area',address=coalesce(p_data->>'address','') where id=p_business_id;
 if not found then raise exception 'BUSINESS_NOT_FOUND'; end if;
 if not private.is_admin() then
   update public.profiles set full_name=p_data->>'full_name',phone=p_data->>'phone' where id=auth.uid();
 end if;
end; $$;
