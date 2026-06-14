create table companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  logo_url text,
  created_at timestamptz default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  name text not null,
  category text not null,
  description text,
  image_url text,
  created_at timestamptz default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) not null,
  type text check (type in ('pdf','doc','image','video','link')) not null,
  title text not null,
  url text not null,          -- storage path or external URL
  indexed boolean default false,
  created_at timestamptz default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) not null,
  user_id uuid references auth.users,
  messages jsonb default '[]',
  hypotheses jsonb default '[]',
  stage text default 'investigating',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bonus: ownership + maintenance
create table maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) not null,
  title text not null,
  interval_months int not null,
  description text
);

create table user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  product_id uuid references products(id) not null,
  purchased_at date,
  created_at timestamptz default now()
);

create table user_maintenance_log (
  id uuid primary key default gen_random_uuid(),
  user_product_id uuid references user_products(id) not null,
  task_id uuid references maintenance_tasks(id) not null,
  due_at timestamptz,
  completed_at timestamptz
);
