-- ============================================
-- FitTrack Pro — Schema Supabase
-- Esegui questo SQL nel SQL Editor di Supabase
-- ============================================

-- Tabella profili (estende auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  nome_completo text not null,
  ruolo text not null check (ruolo in ('atleta', 'trainer')),
  created_at timestamp with time zone default now()
);

-- RLS: ogni utente vede solo il proprio profilo
alter table public.profiles enable row level security;
create policy "Utente vede il proprio profilo"
  on public.profiles for select using (auth.uid() = id);
create policy "Utente crea il proprio profilo"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Trainer vede tutti gli atleti"
  on public.profiles for select using (
    exists (select 1 from public.profiles where id = auth.uid() and ruolo = 'trainer')
  );

-- Tabella schede
create table public.schede (
  id uuid default gen_random_uuid() primary key,
  trainer_id uuid references public.profiles(id) on delete cascade not null,
  atleta_id uuid references public.profiles(id) on delete cascade not null,
  nome text not null,
  descrizione text,
  esercizi jsonb default '[]'::jsonb,
  attiva boolean default true,
  versione integer default 1,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.schede enable row level security;
-- Trainer può fare tutto sulle sue schede
create policy "Trainer gestisce le sue schede"
  on public.schede for all using (auth.uid() = trainer_id);
-- Atleta vede solo le sue schede attive
create policy "Atleta vede le sue schede attive"
  on public.schede for select using (auth.uid() = atleta_id and attiva = true);

-- Aggiorna updated_at automaticamente
create or replace function update_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$
language plpgsql;
create trigger schede_updated_at before update on public.schede
  for each row execute function update_updated_at();

-- Tabella log allenamenti
create table public.workout_logs (
  id uuid default gen_random_uuid() primary key,
  atleta_id uuid references public.profiles(id) on delete cascade not null,
  scheda_id uuid references public.schede(id) on delete set null,
  data timestamp with time zone default now(),
  durata_minuti integer,
  esercizi_log jsonb default '[]'::jsonb,
  volume_totale_kg numeric,
  note text,
  created_at timestamp with time zone default now()
);

alter table public.workout_logs enable row level security;
-- Atleta può inserire e vedere i propri log
create policy "Atleta gestisce i propri log"
  on public.workout_logs for all using (auth.uid() = atleta_id);
-- Trainer vede i log degli atleti che allena
create policy "Trainer vede log dei suoi atleti"
  on public.workout_logs for select using (
    exists (
      select 1 from public.schede s
      where s.id = workout_logs.scheda_id and s.trainer_id = auth.uid()
    )
  );

-- Helper per recuperare atleti di un trainer (join su schede)
create or replace view public.trainer_atleti as
  select distinct p.*
  from public.profiles p
  inner join public.schede s on s.atleta_id = p.id
  where s.trainer_id = auth.uid();
