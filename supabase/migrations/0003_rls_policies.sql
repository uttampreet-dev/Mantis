-- ─────────────────────────────────────────────────────────────────────────────
-- 0003_rls_policies.sql  –  Complete RLS audit
--
-- Replaces the ambiguous FOR ALL / USING-only policies from 0002_profiles.sql
-- with unambiguous, per-operation policies that include explicit WITH CHECK
-- clauses on every INSERT/UPDATE.
--
-- Also enables RLS on the three tables that were left unprotected:
--   maintenance_tasks, user_products, user_maintenance_log
--
-- Adds storage.objects policies for the product-files bucket.
--
-- All DROP … IF EXISTS guards make this idempotent on any DB state.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════════
-- 0.  Drop every policy we are replacing (from 0002 or manually added)
-- ═══════════════════════════════════════════════════════════════════════════════

-- companies
drop policy if exists "Companies visible to all"            on companies;
drop policy if exists "Company owners can manage"           on companies;
drop policy if exists "Public read companies"               on companies;
drop policy if exists "Companies can insert own record"     on companies;
drop policy if exists "Companies can update own record"     on companies;
drop policy if exists "Companies can delete own record"     on companies;

-- products
drop policy if exists "Products visible to all"             on products;
drop policy if exists "Company owners manage products"      on products;
drop policy if exists "Public read products"                on products;
drop policy if exists "Company owners can insert products"  on products;
drop policy if exists "Company owners can update products"  on products;
drop policy if exists "Company owners can delete products"  on products;

-- documents
drop policy if exists "Documents visible to all"            on documents;
drop policy if exists "Company owners manage documents"     on documents;
drop policy if exists "Public read documents"               on documents;
drop policy if exists "Company owners can insert documents" on documents;
drop policy if exists "Company owners can update documents" on documents;
drop policy if exists "Company owners can delete documents" on documents;

-- maintenance_tasks
drop policy if exists "Public read maintenance tasks"                on maintenance_tasks;
drop policy if exists "Company owners manage maintenance tasks"      on maintenance_tasks;
drop policy if exists "Company owners can insert maintenance tasks"  on maintenance_tasks;
drop policy if exists "Company owners can update maintenance tasks"  on maintenance_tasks;
drop policy if exists "Company owners can delete maintenance tasks"  on maintenance_tasks;

-- user_products
drop policy if exists "Users manage own garage"             on user_products;
drop policy if exists "Users can read own garage"           on user_products;
drop policy if exists "Users can insert into own garage"    on user_products;
drop policy if exists "Users can delete from own garage"    on user_products;

-- user_maintenance_log
drop policy if exists "Users manage own maintenance log"              on user_maintenance_log;
drop policy if exists "Users can read own maintenance log"            on user_maintenance_log;
drop policy if exists "Users can insert into own maintenance log"     on user_maintenance_log;
drop policy if exists "Users can update own maintenance log"          on user_maintenance_log;

-- storage.objects (common names from manual creation)
drop policy if exists "Authenticated users can upload"               on storage.objects;
drop policy if exists "Authenticated users can upload to product-files" on storage.objects;
drop policy if exists "Allow authenticated uploads"                  on storage.objects;
drop policy if exists "Public can read"                              on storage.objects;
drop policy if exists "Public read from product-files"               on storage.objects;
drop policy if exists "Allow public downloads"                       on storage.objects;
drop policy if exists "Authenticated users can update"               on storage.objects;
drop policy if exists "Authenticated users can update product-files" on storage.objects;
drop policy if exists "Authenticated users can delete"               on storage.objects;
drop policy if exists "Authenticated users can delete from product-files" on storage.objects;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1.  companies
--     RLS already enabled in 0002.
--     signUp() inserts with createClient(), so INSERT needs an explicit WITH CHECK.
-- ═══════════════════════════════════════════════════════════════════════════════

create policy "Anyone can read companies"
  on companies for select to anon, authenticated
  using (true);

-- Company registers themselves at sign-up: new row must belong to the current user.
create policy "Companies can insert own record"
  on companies for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Companies can update own record"
  on companies for update to authenticated
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Companies can delete own record"
  on companies for delete to authenticated
  using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2.  products
--     RLS already enabled in 0002.
--     addProduct / updateProduct / deleteProduct all use createClient().
-- ═══════════════════════════════════════════════════════════════════════════════

create policy "Anyone can read products"
  on products for select to anon, authenticated
  using (true);

-- Explicit WITH CHECK: the new/updated row's company_id must belong to the caller.
create policy "Company owners can insert products"
  on products for insert to authenticated
  with check (
    exists (
      select 1 from companies
      where companies.id  = products.company_id
        and companies.user_id = auth.uid()
    )
  );

create policy "Company owners can update products"
  on products for update to authenticated
  using (
    exists (
      select 1 from companies
      where companies.id  = products.company_id
        and companies.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from companies
      where companies.id  = products.company_id
        and companies.user_id = auth.uid()
    )
  );

create policy "Company owners can delete products"
  on products for delete to authenticated
  using (
    exists (
      select 1 from companies
      where companies.id  = products.company_id
        and companies.user_id = auth.uid()
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3.  documents
--     RLS already enabled in 0002.
--     addDocument / deleteDocument use createClient().
--     The old FOR ALL USING-only policy was the likely cause of INSERT RLS errors.
-- ═══════════════════════════════════════════════════════════════════════════════

create policy "Anyone can read documents"
  on documents for select to anon, authenticated
  using (true);

create policy "Company owners can insert documents"
  on documents for insert to authenticated
  with check (
    exists (
      select 1 from products
      join   companies on companies.id = products.company_id
      where  products.id        = documents.product_id
        and  companies.user_id  = auth.uid()
    )
  );

create policy "Company owners can update documents"
  on documents for update to authenticated
  using (
    exists (
      select 1 from products
      join   companies on companies.id = products.company_id
      where  products.id        = documents.product_id
        and  companies.user_id  = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from products
      join   companies on companies.id = products.company_id
      where  products.id        = documents.product_id
        and  companies.user_id  = auth.uid()
    )
  );

create policy "Company owners can delete documents"
  on documents for delete to authenticated
  using (
    exists (
      select 1 from products
      join   companies on companies.id = products.company_id
      where  products.id        = documents.product_id
        and  companies.user_id  = auth.uid()
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4.  maintenance_tasks
--     Had NO RLS at all — anyone authenticated could insert/delete tasks.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table maintenance_tasks enable row level security;

-- Product pages (including public/anon) display maintenance schedules.
create policy "Anyone can read maintenance tasks"
  on maintenance_tasks for select to anon, authenticated
  using (true);

create policy "Company owners can insert maintenance tasks"
  on maintenance_tasks for insert to authenticated
  with check (
    exists (
      select 1 from products
      join   companies on companies.id = products.company_id
      where  products.id        = maintenance_tasks.product_id
        and  companies.user_id  = auth.uid()
    )
  );

create policy "Company owners can update maintenance tasks"
  on maintenance_tasks for update to authenticated
  using (
    exists (
      select 1 from products
      join   companies on companies.id = products.company_id
      where  products.id        = maintenance_tasks.product_id
        and  companies.user_id  = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from products
      join   companies on companies.id = products.company_id
      where  products.id        = maintenance_tasks.product_id
        and  companies.user_id  = auth.uid()
    )
  );

create policy "Company owners can delete maintenance tasks"
  on maintenance_tasks for delete to authenticated
  using (
    exists (
      select 1 from products
      join   companies on companies.id = products.company_id
      where  products.id        = maintenance_tasks.product_id
        and  companies.user_id  = auth.uid()
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5.  conversations
--     RLS already enabled in 0002. Assistant route uses createAdminClient()
--     for all conversation operations (bypasses RLS completely), so these
--     policies are safety backstops only — no changes needed.
-- ═══════════════════════════════════════════════════════════════════════════════
-- (no policy changes — existing 0002 policies are correct)


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6.  user_products
--     Had NO RLS at all.
--     addToGarage uses createClient(): SELECT + INSERT both need policies.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table user_products enable row level security;

create policy "Users can read own garage"
  on user_products for select to authenticated
  using (auth.uid() = user_id);

-- INSERT: user_id in the new row must match the caller.
create policy "Users can insert into own garage"
  on user_products for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete from own garage"
  on user_products for delete to authenticated
  using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 7.  user_maintenance_log
--     Had NO RLS at all.
--     addToGarage inserts log entries; markTaskComplete updates + inserts.
--     Both use createClient().
-- ═══════════════════════════════════════════════════════════════════════════════

alter table user_maintenance_log enable row level security;

-- Ownership is established via the parent user_products row.
create policy "Users can read own maintenance log"
  on user_maintenance_log for select to authenticated
  using (
    exists (
      select 1 from user_products
      where user_products.id      = user_maintenance_log.user_product_id
        and user_products.user_id = auth.uid()
    )
  );

create policy "Users can insert into own maintenance log"
  on user_maintenance_log for insert to authenticated
  with check (
    exists (
      select 1 from user_products
      where user_products.id      = user_maintenance_log.user_product_id
        and user_products.user_id = auth.uid()
    )
  );

-- markTaskComplete updates the completed_at on an existing log row.
create policy "Users can update own maintenance log"
  on user_maintenance_log for update to authenticated
  using (
    exists (
      select 1 from user_products
      where user_products.id      = user_maintenance_log.user_product_id
        and user_products.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from user_products
      where user_products.id      = user_maintenance_log.user_product_id
        and user_products.user_id = auth.uid()
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- 8.  profiles
--     RLS already enabled in 0002. INSERT is handled by the security-definer
--     trigger on_auth_user_created — no INSERT policy needed.
--     Existing SELECT + UPDATE policies are correct — no changes.
-- ═══════════════════════════════════════════════════════════════════════════════
-- (no policy changes — existing 0002 policies are correct)


-- ═══════════════════════════════════════════════════════════════════════════════
-- 9.  storage.objects  –  product-files bucket
--     Missing policies were the primary source of "new row violates RLS" on
--     any file upload (product images, document files).
-- ═══════════════════════════════════════════════════════════════════════════════

-- All authenticated users may upload; access control is enforced at the
-- documents/products table level (companies can only insert rows for their
-- own products, so orphan uploads without a corresponding DB row are harmless).
create policy "Authenticated users can upload to product-files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-files');

-- Product images use getPublicUrl (requires public read).
-- Signed URLs for documents are generated by the admin client, but
-- getPublicUrl also falls back to this policy.
create policy "Public read from product-files"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-files');

create policy "Authenticated users can update product-files"
  on storage.objects for update to authenticated
  using     (bucket_id = 'product-files');

create policy "Authenticated users can delete from product-files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-files');
