-- Creates the initial admin user using values provided via psql variables
-- Variables expected (passed via -v in scripts/seeder.js):
--   :admin_email
--   :admin_password

INSERT INTO public.users (
  email,
  password_hash,
  email_verified,
  tier,
  created_at,
  updated_at
)
VALUES (
  :'admin_email',
  crypt(:'admin_password', gen_salt('bf')),
  TRUE,
  'premium',
  timezone('utc', now()),
  timezone('utc', now())
)
ON CONFLICT (email) DO NOTHING;

