-- Profiles table linked to auth.users
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('company', 'user')),
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Auto-create profile on new auth user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'role', 'user'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS for companies
alter table companies enable row level security;
create policy "Companies visible to all" on companies for select using (true);
create policy "Company owners can manage" on companies for all using (auth.uid() = user_id);

-- RLS for products
alter table products enable row level security;
create policy "Products visible to all" on products for select using (true);
create policy "Company owners manage products" on products for all using (
  exists (select 1 from companies where companies.id = products.company_id and companies.user_id = auth.uid())
);

-- RLS for documents
alter table documents enable row level security;
create policy "Documents visible to all" on documents for select using (true);
create policy "Company owners manage documents" on documents for all using (
  exists (
    select 1 from products
    join companies on companies.id = products.company_id
    where products.id = documents.product_id and companies.user_id = auth.uid()
  )
);

-- RLS for conversations
alter table conversations enable row level security;
create policy "Users see own conversations" on conversations for select using (auth.uid() = user_id or user_id is null);
create policy "Users manage own conversations" on conversations for all using (auth.uid() = user_id or user_id is null);
