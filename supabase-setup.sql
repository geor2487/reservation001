-- ============================================
-- Supabase セットアップSQL
-- SQL Editor で実行してください
-- ============================================

-- 1. profiles テーブル（staff + customers 統合）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('staff', 'customer')),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. tables テーブル
CREATE TABLE tables (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  capacity INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. reservations テーブル
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  table_id INTEGER NOT NULL REFERENCES tables(id),
  customer_id UUID REFERENCES profiles(id),
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  party_size INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed',
  note TEXT,
  created_by VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ダブルブッキング防止インデックス
CREATE INDEX idx_reservations_table_date
ON reservations (table_id, date, start_time, end_time)
WHERE status = 'confirmed';

-- 5. updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tables_updated_at
  BEFORE UPDATE ON tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. auth.users 作成時に profiles を自動作成するトリガー
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 7. RLS（service_role はバイパスするので最低限）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- service_role は全アクセス可能（デフォルト）
-- anon / authenticated 用の最低限ポリシー
CREATE POLICY "Allow read tables for everyone" ON tables
  FOR SELECT USING (true);

CREATE POLICY "Allow read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Allow read own reservations" ON reservations
  FOR SELECT USING (customer_id = auth.uid());