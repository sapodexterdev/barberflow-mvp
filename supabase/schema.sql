-- BarberFlow MVP — banco multiempresa seguro
-- Execute este arquivo no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.barbershops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.barbershop_members (
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (barbershop_id, user_id)
);

create table if not exists public.barbershop_state (
  barbershop_id uuid primary key references public.barbershops(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index if not exists barbershop_members_user_id_idx
  on public.barbershop_members(user_id);

alter table public.barbershops enable row level security;
alter table public.barbershop_members enable row level security;
alter table public.barbershop_state enable row level security;

create or replace function public.is_barbershop_member(shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.barbershop_members
    where barbershop_id = shop_id
      and user_id = auth.uid()
  );
$$;

drop policy if exists "Members can view their barbershop" on public.barbershops;
create policy "Members can view their barbershop"
on public.barbershops for select
to authenticated
using (public.is_barbershop_member(id));

drop policy if exists "Members can view memberships" on public.barbershop_members;
create policy "Members can view memberships"
on public.barbershop_members for select
to authenticated
using (public.is_barbershop_member(barbershop_id));

drop policy if exists "Members can view state" on public.barbershop_state;
create policy "Members can view state"
on public.barbershop_state for select
to authenticated
using (public.is_barbershop_member(barbershop_id));

drop policy if exists "Members can update state" on public.barbershop_state;
create policy "Members can update state"
on public.barbershop_state for update
to authenticated
using (public.is_barbershop_member(barbershop_id))
with check (public.is_barbershop_member(barbershop_id));

create or replace function public.initialize_barbershop(shop_name text, initial_data jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_shop_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  if exists (
    select 1 from public.barbershop_members where user_id = auth.uid()
  ) then
    select barbershop_id into new_shop_id
    from public.barbershop_members
    where user_id = auth.uid()
    order by created_at
    limit 1;
    return new_shop_id;
  end if;

  insert into public.barbershops (name, owner_id)
  values (coalesce(nullif(trim(shop_name), ''), 'Minha barbearia'), auth.uid())
  returning id into new_shop_id;

  insert into public.barbershop_members (barbershop_id, user_id, role)
  values (new_shop_id, auth.uid(), 'owner');

  insert into public.barbershop_state (barbershop_id, data, updated_by)
  values (new_shop_id, coalesce(initial_data, '{}'::jsonb), auth.uid());

  return new_shop_id;
end;
$$;

create or replace function public.get_my_barbershop_state()
returns table (
  barbershop_id uuid,
  barbershop_name text,
  data jsonb,
  version bigint,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.name, s.data, s.version, s.updated_at
  from public.barbershop_members m
  join public.barbershops b on b.id = m.barbershop_id
  join public.barbershop_state s on s.barbershop_id = b.id
  where m.user_id = auth.uid()
  order by m.created_at
  limit 1;
$$;

create or replace function public.save_my_barbershop_state(new_data jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop_id uuid;
  new_version bigint;
begin
  select barbershop_id into shop_id
  from public.barbershop_members
  where user_id = auth.uid()
  order by created_at
  limit 1;

  if shop_id is null then
    raise exception 'Barbearia não encontrada';
  end if;

  update public.barbershop_state
  set data = coalesce(new_data, '{}'::jsonb),
      version = version + 1,
      updated_at = now(),
      updated_by = auth.uid()
  where barbershop_id = shop_id
  returning version into new_version;

  return new_version;
end;
$$;

revoke all on function public.initialize_barbershop(text, jsonb) from public;
revoke all on function public.get_my_barbershop_state() from public;
revoke all on function public.save_my_barbershop_state(jsonb) from public;

grant execute on function public.initialize_barbershop(text, jsonb) to authenticated;
grant execute on function public.get_my_barbershop_state() to authenticated;
grant execute on function public.save_my_barbershop_state(jsonb) to authenticated;
