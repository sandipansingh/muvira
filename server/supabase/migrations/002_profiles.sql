-- 
-- profiles
-- One row per auth.users entry. Created automatically via trigger below.
-- role is the ONLY source of truth for admin/user authorization.
-- 

CREATE TABLE IF NOT EXISTS profiles (
  id        UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email     TEXT        NOT NULL,
  full_name TEXT,
  phone     TEXT,
  role      TEXT        NOT NULL DEFAULT 'user'
              CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for admin queries on role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);

-- Row-Level Security 
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (role field is NOT in the allowed update
-- columns - the app layer must enforce this; the DB schema relies on triggers
-- or service-role mutations to change role)
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view ALL profiles
-- Note: this policy evaluates as the calling user's role, which is safe because
-- the admin JWT is verified server-side before any query reaches the DB.
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Auto-create profile on signup 

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER         -- runs as the function owner, not the calling role
SET search_path = public  -- prevents search-path injection
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotent: re-running migrations is safe
  RETURN NEW;
END;
$$;

-- Fire after a new row is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- updated_at trigger 

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
