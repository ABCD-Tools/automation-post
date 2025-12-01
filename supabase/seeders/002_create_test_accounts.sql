-- Inserts basic test users. Safe to run multiple times due to ON CONFLICT.

INSERT INTO public.users (
  email,
  password_hash,
  email_verified,
  tier,
  created_at,
  updated_at
)
VALUES
  (
    'test1@example.com',
    crypt('Test123!@#', gen_salt('bf')),
    TRUE,
    'free',
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    'test2@example.com',
    crypt('Test123!@#', gen_salt('bf')),
    TRUE,
    'free',
    timezone('utc', now()),
    timezone('utc', now())
  )
ON CONFLICT (email) DO NOTHING;

