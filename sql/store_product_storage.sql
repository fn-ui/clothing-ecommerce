insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'store-products',
  'store-products',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public product images are readable"
on storage.objects
for select
to public
using (bucket_id = 'store-products');

create policy "Authenticated users can upload product images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'store-products');

create policy "Authenticated users can update product images"
on storage.objects
for update
to authenticated
using (bucket_id = 'store-products')
with check (bucket_id = 'store-products');

create policy "Authenticated users can delete product images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'store-products');
