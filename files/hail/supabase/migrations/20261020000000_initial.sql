-- =====================================================================
-- Hail — initial schema
-- Run with `supabase db reset` (put in supabase/migrations/ for real use)
-- =====================================================================

create extension if not exists postgis with schema extensions;

-- ---------- Enums ----------------------------------------------------
create type public.user_role       as enum ('passenger', 'driver', 'admin');
create type public.ride_status     as enum ('pending', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled');
create type public.vehicle_type    as enum ('economy', 'comfort', 'xl', 'bike');
create type public.document_type   as enum ('drivers_license', 'vehicle_registration', 'insurance', 'id_card');
create type public.document_status as enum ('pending', 'approved', 'rejected');

-- ---------- Shared trigger -------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- Tables ---------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'passenger',
  full_name   text,
  phone       text,
  avatar_url  text,
  is_online   boolean not null default false,
  is_approved boolean not null default false,   -- drivers need admin approval before going online
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.vehicles (
  id           uuid primary key default gen_random_uuid(),
  driver_id    uuid not null references public.profiles (id) on delete cascade,
  vehicle_type public.vehicle_type not null default 'economy',
  make         text not null,
  model        text not null,
  year         integer check (year between 1990 and 2100),
  plate        text not null unique,
  color        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index vehicles_driver_idx on public.vehicles (driver_id);

create table public.driver_documents (
  id               uuid primary key default gen_random_uuid(),
  driver_id        uuid not null references public.profiles (id) on delete cascade,
  doc_type         public.document_type not null,
  file_path        text not null,                -- path inside the private `driver-documents` bucket
  status           public.document_status not null default 'pending',
  rejection_reason text,
  reviewed_by      uuid references public.profiles (id),
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index driver_documents_driver_idx on public.driver_documents (driver_id);
create index driver_documents_pending_idx on public.driver_documents (created_at) where status = 'pending';

create table public.fare_rules (
  id               uuid primary key default gen_random_uuid(),
  vehicle_type     public.vehicle_type not null,
  base_fare        numeric(10, 2) not null default 2.00 check (base_fare >= 0),
  per_km           numeric(10, 2) not null default 0.90 check (per_km >= 0),
  per_minute       numeric(10, 2) not null default 0.20 check (per_minute >= 0),
  minimum_fare     numeric(10, 2) not null default 3.00 check (minimum_fare >= 0),
  surge_multiplier numeric(4, 2)  not null default 1.00 check (surge_multiplier >= 1),
  currency         text not null default 'USD',
  is_active        boolean not null default true,
  updated_at       timestamptz not null default now()
);
create unique index fare_rules_one_active_per_type on public.fare_rules (vehicle_type) where is_active;
create trigger fare_rules_updated_at before update on public.fare_rules
  for each row execute function public.set_updated_at();

insert into public.fare_rules (vehicle_type, base_fare, per_km, per_minute, minimum_fare) values
  ('economy', 2.00, 0.90, 0.20, 3.00),
  ('comfort', 3.00, 1.30, 0.28, 4.50),
  ('xl',      4.00, 1.70, 0.35, 6.00),
  ('bike',    1.00, 0.50, 0.10, 1.50);

create table public.rides (
  id              uuid primary key default gen_random_uuid(),
  passenger_id    uuid not null references public.profiles (id),
  driver_id       uuid references public.profiles (id),
  vehicle_id      uuid references public.vehicles (id),
  vehicle_type    public.vehicle_type not null default 'economy',
  status          public.ride_status not null default 'pending',

  pickup_lat      double precision not null,
  pickup_lng      double precision not null,
  pickup_address  text,
  pickup_geo      geography(Point, 4326) not null,
  dropoff_lat     double precision not null,
  dropoff_lng     double precision not null,
  dropoff_address text,
  dropoff_geo     geography(Point, 4326) not null,

  distance_m      integer not null check (distance_m >= 0),
  duration_s      integer not null check (duration_s >= 0),
  fare_estimate   numeric(10, 2) not null,
  fare_final      numeric(10, 2),
  currency        text not null default 'USD',

  requested_at    timestamptz not null default now(),
  accepted_at     timestamptz,
  arrived_at      timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  cancelled_at    timestamptz,
  cancelled_by    uuid references public.profiles (id),
  cancel_reason   text
);
create index rides_passenger_idx on public.rides (passenger_id, requested_at desc);
create index rides_driver_idx    on public.rides (driver_id, requested_at desc);
create index rides_pending_idx   on public.rides (requested_at desc) where status = 'pending';
create index rides_pickup_geo_idx on public.rides using gist (pickup_geo);
-- Race-condition guards: one live ride per passenger, one live ride per driver.
create unique index rides_one_active_per_passenger on public.rides (passenger_id)
  where status in ('pending', 'accepted', 'arrived', 'in_progress');
create unique index rides_one_active_per_driver on public.rides (driver_id)
  where status in ('accepted', 'arrived', 'in_progress');
alter table public.rides replica identity full;

-- Latest known position per user (one row each, upserted). Keeps Realtime traffic light.
create table public.locations (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  heading     real,
  speed       real,
  accuracy    real,
  geom        geography(Point, 4326) not null,
  recorded_at timestamptz not null default now()
);
create index locations_geom_idx on public.locations using gist (geom);

create function public.locations_set_geom() returns trigger
language plpgsql set search_path = public, extensions as $$
begin
  new.geom := st_setsrid(st_makepoint(new.lng, new.lat), 4326)::geography;
  new.recorded_at := now();
  return new;
end $$;
create trigger locations_geom before insert or update on public.locations
  for each row execute function public.locations_set_geom();

create table public.sos_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id),
  ride_id     uuid references public.rides (id),
  lat         double precision,
  lng         double precision,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id)
);
create index sos_open_idx on public.sos_events (created_at desc) where resolved_at is null;

-- ---------- Auth helpers ---------------------------------------------
-- New auth users get a profile. Clients may only self-select passenger or driver.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'driver'
         then 'driver'::public.user_role else 'passenger'::public.user_role end,
    new.raw_user_meta_data ->> 'full_name',
    new.phone
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.current_user_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create function public.is_active_driver() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'driver' and is_online and is_approved from public.profiles where id = auth.uid()),
    false)
$$;

-- Non-admins can't change their own role or approval, and can't go online unapproved.
create function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.is_approved := old.is_approved;
  end if;
  if not new.is_approved or new.role <> 'driver' then
    new.is_online := false;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------- Row Level Security ---------------------------------------
alter table public.profiles         enable row level security;
alter table public.vehicles         enable row level security;
alter table public.driver_documents enable row level security;
alter table public.fare_rules       enable row level security;
alter table public.rides            enable row level security;
alter table public.locations        enable row level security;
alter table public.sos_events       enable row level security;

-- profiles
create policy "profiles: read own" on public.profiles for select using (id = auth.uid());
create policy "profiles: admin read" on public.profiles for select using (public.is_admin());
create policy "profiles: read ride counterpart" on public.profiles for select using (
  exists (
    select 1 from public.rides r
    where r.status in ('accepted', 'arrived', 'in_progress', 'completed')
      and ((r.passenger_id = auth.uid() and r.driver_id = profiles.id)
        or (r.driver_id = auth.uid() and r.passenger_id = profiles.id))
  )
);
create policy "profiles: update own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin update" on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- vehicles
create policy "vehicles: driver manages own" on public.vehicles for all
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid() and public.current_user_role() = 'driver');
create policy "vehicles: admin all" on public.vehicles for all
  using (public.is_admin()) with check (public.is_admin());
create policy "vehicles: passenger reads ride vehicle" on public.vehicles for select using (
  exists (select 1 from public.rides r where r.vehicle_id = vehicles.id and r.passenger_id = auth.uid())
);

-- driver_documents (drivers can upload and read; only admins change status)
create policy "documents: driver reads own" on public.driver_documents for select
  using (driver_id = auth.uid());
create policy "documents: driver uploads own" on public.driver_documents for insert
  with check (driver_id = auth.uid() and status = 'pending');
create policy "documents: admin all" on public.driver_documents for all
  using (public.is_admin()) with check (public.is_admin());

-- fare_rules
create policy "fare_rules: read" on public.fare_rules for select to authenticated using (true);
create policy "fare_rules: admin write" on public.fare_rules for all
  using (public.is_admin()) with check (public.is_admin());

-- rides: read-only for clients. All writes go through the functions below.
create policy "rides: passenger reads own" on public.rides for select using (passenger_id = auth.uid());
create policy "rides: driver reads assigned" on public.rides for select using (driver_id = auth.uid());
create policy "rides: online drivers read pending" on public.rides for select
  using (status = 'pending' and public.is_active_driver());
create policy "rides: admin all" on public.rides for all
  using (public.is_admin()) with check (public.is_admin());

-- locations
create policy "locations: write own insert" on public.locations for insert with check (user_id = auth.uid());
create policy "locations: write own update" on public.locations for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "locations: read own" on public.locations for select using (user_id = auth.uid());
create policy "locations: admin read" on public.locations for select using (public.is_admin());
create policy "locations: passenger reads assigned driver" on public.locations for select using (
  exists (
    select 1 from public.rides r
    where r.passenger_id = auth.uid()
      and r.driver_id = locations.user_id
      and r.status in ('accepted', 'arrived', 'in_progress')
  )
);

-- sos_events
create policy "sos: insert own" on public.sos_events for insert with check (user_id = auth.uid());
create policy "sos: read own" on public.sos_events for select using (user_id = auth.uid());
create policy "sos: admin all" on public.sos_events for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Functions (RPC) ------------------------------------------
create function public.estimate_fare(
  p_distance_m   integer,
  p_duration_s   integer,
  p_vehicle_type public.vehicle_type default 'economy'
) returns table (fare numeric, currency text, surge_multiplier numeric)
language sql stable set search_path = public as $$
  select greatest(
           r.minimum_fare,
           round((r.base_fare + r.per_km * p_distance_m / 1000.0 + r.per_minute * p_duration_s / 60.0)
                 * r.surge_multiplier, 2)),
         r.currency,
         r.surge_multiplier
  from public.fare_rules r
  where r.vehicle_type = p_vehicle_type and r.is_active
  limit 1
$$;

-- Fare is computed server-side so clients can't set their own price.
-- NOTE: distance/duration come from the client's Mapbox call. For production, recompute them
-- in an Edge Function before inserting.
create function public.request_ride(
  p_pickup_lat double precision, p_pickup_lng double precision, p_pickup_address text,
  p_dropoff_lat double precision, p_dropoff_lng double precision, p_dropoff_address text,
  p_distance_m integer, p_duration_s integer,
  p_vehicle_type public.vehicle_type default 'economy'
) returns public.rides
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_fare numeric;
  v_currency text;
  v_ride public.rides;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if public.current_user_role() is distinct from 'passenger' then
    raise exception 'Only passengers can request rides' using errcode = '42501';
  end if;

  select f.fare, f.currency into v_fare, v_currency
  from public.estimate_fare(p_distance_m, p_duration_s, p_vehicle_type) f;
  if v_fare is null then
    raise exception 'No active fare rule for %', p_vehicle_type;
  end if;

  insert into public.rides (
    passenger_id, vehicle_type,
    pickup_lat, pickup_lng, pickup_address, pickup_geo,
    dropoff_lat, dropoff_lng, dropoff_address, dropoff_geo,
    distance_m, duration_s, fare_estimate, currency
  ) values (
    auth.uid(), p_vehicle_type,
    p_pickup_lat, p_pickup_lng, p_pickup_address,
    st_setsrid(st_makepoint(p_pickup_lng, p_pickup_lat), 4326)::geography,
    p_dropoff_lat, p_dropoff_lng, p_dropoff_address,
    st_setsrid(st_makepoint(p_dropoff_lng, p_dropoff_lat), 4326)::geography,
    p_distance_m, p_duration_s, v_fare, v_currency
  ) returning * into v_ride;

  return v_ride;
end $$;

-- Atomic claim: the WHERE status = 'pending' guard means only one driver wins.
create function public.accept_ride(p_ride_id uuid) returns public.rides
language plpgsql security definer set search_path = public as $$
declare
  v_ride public.rides;
  v_vehicle uuid;
begin
  if not public.is_active_driver() then
    raise exception 'Go online and get approved before accepting rides' using errcode = '42501';
  end if;

  select id into v_vehicle from public.vehicles
  where driver_id = auth.uid() and is_active order by created_at limit 1;

  update public.rides
     set driver_id = auth.uid(), vehicle_id = v_vehicle, status = 'accepted', accepted_at = now()
   where id = p_ride_id and status = 'pending'
   returning * into v_ride;

  if not found then
    raise exception 'This ride was taken or cancelled' using errcode = 'P0002';
  end if;
  return v_ride;
end $$;

create function public.set_ride_status(
  p_ride_id uuid, p_status public.ride_status, p_reason text default null
) returns public.rides
language plpgsql security definer set search_path = public as $$
declare
  v_ride public.rides;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found then
    raise exception 'Ride not found' using errcode = 'P0002';
  end if;

  if p_status = 'cancelled' then
    if auth.uid() is distinct from v_ride.passenger_id
       and auth.uid() is distinct from v_ride.driver_id
       and not public.is_admin() then
      raise exception 'Not allowed' using errcode = '42501';
    end if;
    if v_ride.status not in ('pending', 'accepted', 'arrived') then
      raise exception 'This ride can no longer be cancelled';
    end if;
    update public.rides
       set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = p_reason
     where id = p_ride_id returning * into v_ride;
    return v_ride;
  end if;

  if v_ride.driver_id is distinct from auth.uid() then
    raise exception 'Only the assigned driver can update this ride' using errcode = '42501';
  end if;
  if not ((v_ride.status = 'accepted'    and p_status = 'arrived')
       or (v_ride.status = 'arrived'     and p_status = 'in_progress')
       or (v_ride.status = 'in_progress' and p_status = 'completed')) then
    raise exception 'Invalid status change: % to %', v_ride.status, p_status;
  end if;

  update public.rides
     set status = p_status,
         arrived_at   = case when p_status = 'arrived'     then now() else arrived_at end,
         started_at   = case when p_status = 'in_progress' then now() else started_at end,
         completed_at = case when p_status = 'completed'   then now() else completed_at end,
         fare_final   = case when p_status = 'completed'   then fare_estimate else fare_final end
   where id = p_ride_id returning * into v_ride;
  return v_ride;
end $$;

create function public.nearby_drivers(
  p_lat double precision, p_lng double precision, p_radius_m integer default 5000
) returns table (driver_id uuid, lat double precision, lng double precision, heading real, distance_m double precision)
language sql stable security definer set search_path = public, extensions as $$
  select l.user_id, l.lat, l.lng, l.heading,
         st_distance(l.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
  from public.locations l
  join public.profiles p on p.id = l.user_id
  where p.role = 'driver' and p.is_online and p.is_approved
    and l.recorded_at > now() - interval '2 minutes'
    and st_dwithin(l.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)
    and not exists (
      select 1 from public.rides r
      where r.driver_id = p.id and r.status in ('accepted', 'arrived', 'in_progress'))
  order by 5
  limit 20
$$;
revoke execute on function public.nearby_drivers(double precision, double precision, integer) from public, anon;
grant  execute on function public.nearby_drivers(double precision, double precision, integer) to authenticated;

-- Runs as the caller, so RLS limits it to the signed-in driver's own rides.
create function public.driver_earnings(p_days integer default 7)
returns table (day date, trips bigint, total numeric)
language sql stable set search_path = public as $$
  select d::date, count(r.id), coalesce(sum(r.fare_final), 0)
  from generate_series(current_date - (p_days - 1), current_date, interval '1 day') d
  left join public.rides r
    on r.driver_id = auth.uid() and r.status = 'completed' and r.completed_at::date = d::date
  group by 1
  order by 1
$$;

-- Newer Supabase projects revoke EXECUTE on public functions from anon/authenticated.
-- Grant the client RPCs explicitly. nearby_drivers is already restricted above.
revoke execute on function public.estimate_fare(integer, integer, public.vehicle_type) from public, anon;
revoke execute on function public.request_ride(double precision, double precision, text, double precision, double precision, text, integer, integer, public.vehicle_type) from public, anon;
revoke execute on function public.accept_ride(uuid) from public, anon;
revoke execute on function public.set_ride_status(uuid, public.ride_status, text) from public, anon;
revoke execute on function public.driver_earnings(integer) from public, anon;
grant execute on function public.estimate_fare(integer, integer, public.vehicle_type) to authenticated;
grant execute on function public.request_ride(double precision, double precision, text, double precision, double precision, text, integer, integer, public.vehicle_type) to authenticated;
grant execute on function public.accept_ride(uuid) to authenticated;
grant execute on function public.set_ride_status(uuid, public.ride_status, text) to authenticated;
grant execute on function public.driver_earnings(integer) to authenticated;

-- ---------- Realtime -------------------------------------------------
alter publication supabase_realtime add table public.rides;
alter publication supabase_realtime add table public.locations;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.sos_events;

-- ---------- Storage: private bucket for driver documents -------------
insert into storage.buckets (id, name, public) values ('driver-documents', 'driver-documents', false)
on conflict (id) do nothing;

create policy "driver docs: upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'driver-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "driver docs: read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'driver-documents'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- To create your first admin (run once in the SQL editor after signing up):
--   update public.profiles set role = 'admin' where id = '<your-auth-user-uuid>';
