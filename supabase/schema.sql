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
  professional_name text,
  created_at timestamptz not null default now(),
  primary key (barbershop_id, user_id)
);

alter table public.barbershop_members
  add column if not exists professional_name text;

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  email text not null,
  professional_name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (barbershop_id, email)
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
alter table public.staff_invites enable row level security;

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
    order by (professional_name is not null) desc, created_at
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
  order by (m.professional_name is not null) desc, m.created_at
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
  order by (professional_name is not null) desc, created_at
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

create or replace function public.get_my_access()
returns table (
  role text,
  professional_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.role, m.professional_name
  from public.barbershop_members m
  where m.user_id = auth.uid()
  order by (m.professional_name is not null) desc, m.created_at
  limit 1;
$$;

create or replace function public.invite_staff_member(staff_email text, staff_professional_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop_id uuid;
  current_role text;
  existing_user_id uuid;
begin
  select m.barbershop_id, m.role into shop_id, current_role
  from public.barbershop_members m
  where m.user_id = auth.uid()
  order by m.created_at
  limit 1;

  if shop_id is null or current_role not in ('owner', 'admin') then
    raise exception 'Sem permissão para gerenciar equipe';
  end if;

  insert into public.staff_invites (barbershop_id, email, professional_name, created_by)
  values (shop_id, lower(trim(staff_email)), trim(staff_professional_name), auth.uid())
  on conflict (barbershop_id, email)
  do update set professional_name = excluded.professional_name, created_by = auth.uid(), created_at = now();

  select id into existing_user_id
  from auth.users
  where lower(email) = lower(trim(staff_email))
  limit 1;

  if existing_user_id is not null then
    insert into public.barbershop_members (barbershop_id, user_id, role, professional_name)
    values (shop_id, existing_user_id, 'member', trim(staff_professional_name))
    on conflict (barbershop_id, user_id)
    do update set role = 'member', professional_name = excluded.professional_name;
  end if;
end;
$$;

create or replace function public.accept_staff_invite()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_record record;
  current_email text;
begin
  current_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if auth.uid() is null or current_email = '' then return false; end if;

  select * into invite_record
  from public.staff_invites
  where lower(email) = current_email
  order by created_at desc
  limit 1;

  if invite_record is null then return false; end if;

  insert into public.barbershop_members (barbershop_id, user_id, role, professional_name)
  values (invite_record.barbershop_id, auth.uid(), 'member', invite_record.professional_name)
  on conflict (barbershop_id, user_id)
  do update set role = 'member', professional_name = excluded.professional_name;

  delete from public.staff_invites where id = invite_record.id;
  return true;
end;
$$;

revoke all on function public.initialize_barbershop(text, jsonb) from public;
revoke all on function public.get_my_barbershop_state() from public;
revoke all on function public.save_my_barbershop_state(jsonb) from public;
revoke all on function public.get_my_access() from public;
revoke all on function public.invite_staff_member(text, text) from public;
revoke all on function public.accept_staff_invite() from public;

grant execute on function public.initialize_barbershop(text, jsonb) to authenticated;
grant execute on function public.get_my_barbershop_state() to authenticated;
grant execute on function public.save_my_barbershop_state(jsonb) to authenticated;
grant execute on function public.get_my_access() to authenticated;
grant execute on function public.invite_staff_member(text, text) to authenticated;
grant execute on function public.accept_staff_invite() to authenticated;
