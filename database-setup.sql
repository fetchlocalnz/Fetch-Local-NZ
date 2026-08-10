-- Fetch Local: initial database setup
-- Run this once in the Supabase SQL Editor before using the app.

-- One row per human, linked to their Supabase login
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  city text not null,
  created_at timestamp with time zone default now()
);

alter table profiles enable row level security;

create policy "Anyone can view profiles"
  on profiles for select
  using (true);

create policy "Users can create their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- One row per dog, linked to its owner's profile
create table dogs (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  breed text,
  age int,
  energy_level text,
  recall_reliable boolean default false,
  bio text,
  created_at timestamp with time zone default now()
);

alter table dogs enable row level security;

create policy "Anyone can view dogs"
  on dogs for select
  using (true);

create policy "Owners can add their own dogs"
  on dogs for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their own dogs"
  on dogs for update
  using (auth.uid() = owner_id);

create policy "Owners can delete their own dogs"
  on dogs for delete
  using (auth.uid() = owner_id);
