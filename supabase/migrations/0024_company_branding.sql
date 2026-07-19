-- CivFlow — company name & logo branding.
--
-- Lets a company rename themselves (companies.name was already editable at
-- the DB level via the existing "admins can update their company" RLS
-- policy from 0005_qbcc_compliance.sql, but there was no UI for it) and
-- upload a logo that replaces the CivFlow mark on every printed/PDF
-- document (diary entries, variations, the client report).
--
-- The logo bucket is public (unlike diary-media, which is private and
-- requires an authenticated role or a signed URL) because a company logo
-- isn't sensitive, and it needs to render in a plain <img> tag on printed
-- pages without any signed-URL plumbing. Storage path convention:
-- `<company_id>/logo` with no extension — a fixed path per company means
-- uploading a new logo is a simple upsert (overwrite) rather than needing
-- to track/delete the old file.

alter table companies add column logo_storage_path text;

insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

create policy "authenticated users can upload company logos"
  on storage.objects for insert
  with check (bucket_id = 'company-logos' and auth.role() = 'authenticated');

create policy "authenticated users can update company logos"
  on storage.objects for update
  using (bucket_id = 'company-logos' and auth.role() = 'authenticated');

create policy "authenticated users can delete company logos"
  on storage.objects for delete
  using (bucket_id = 'company-logos' and auth.role() = 'authenticated');

create policy "anyone can view company logos"
  on storage.objects for select
  using (bucket_id = 'company-logos');
