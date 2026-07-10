# STUDIO_FIT launch setup

Follow these steps after the code changes.

## 1. Confirm admin login

In Supabase Auth, the admin email must exist as a user. In `store_profiles`, the same user id must have:

- `email`: `admin@studiofit.com`
- `role`: `admin`
- `full_name`: optional

If login hangs or fails, check:

- Supabase project URL and anon key in `admin/js/supabase.js`
- Supabase Auth email/password user exists
- `store_profiles.id` equals the Auth user id
- RLS policies allow the signed-in admin to read their profile

## 2. Supabase policies you need

Use Row Level Security, but add policies for the app.

Recommended behavior:

- `store_profiles`: users can read their own row; admins can manage admin data.
- `store_products`: public can read active products; admins can insert/update/delete.
- `store_product_images`: public can read images; admins can insert/update/delete.
- `store_categories`: public can read categories; admins can insert/update/delete.
- `store_newsletter`: public can insert email signups; admins can read/delete.

Example newsletter insert policy:

```sql
create policy "Anyone can subscribe"
on store_newsletter
for insert
to anon, authenticated
with check (true);
```

## 3. Supabase storage

Create a storage bucket named:

```text
store_products
```

Make it public if you want product images to load directly from public URLs. Add storage policies that allow authenticated admins to upload/delete files.

## 4. Newsletter

The home page form now writes to `store_newsletter` through `js/supabase-public.js`. If signup shows a policy error, add the newsletter insert policy above.

## 5. Payment processing

The checkout page now lets customers choose:

- M-Pesa
- PayPal
- Paystack

These are UI choices only until you connect real payment APIs. You will need a small backend or Vercel serverless function to create payment sessions securely. Do not put M-Pesa consumer secrets, PayPal secrets, or Paystack secret keys in browser JavaScript.

## 6. Vercel deployment

You can deploy this project directly on Vercel without buying a domain. Vercel will give you a free `.vercel.app` URL. Add `robots.txt` and `sitemap.xml` later only if you connect a real custom domain and want to manage SEO indexing directly.

## 7. Product data

Use the admin Products page to create products and upload images. The public storefront currently uses demo catalog data in `js/catalog.js`; the next production step is to render storefront products from Supabase instead of that demo file.
