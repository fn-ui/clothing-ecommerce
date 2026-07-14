create table if not exists public.store_product_variants (
  id uuid not null default gen_random_uuid(),
  product_id uuid not null,
  color text not null,
  size text not null,
  stock integer not null default 0,
  sku text null,
  image_url text null,
  created_at timestamp with time zone null default now(),
  constraint store_product_variants_pkey primary key (id),
  constraint store_product_variants_product_id_fkey foreign key (product_id) references public.store_products (id) on delete cascade,
  constraint store_product_variants_product_color_size_key unique (product_id, color, size)
) tablespace pg_default;

create index if not exists store_product_variants_product_id_idx
  on public.store_product_variants using btree (product_id);
