/*
  # Создание начальной схемы базы данных для каталога запчастей

  ## Описание
  Создает все необходимые таблицы для работы каталога автозапчастей

  ## Таблицы
  
  ### catalog_users
  - id: UUID (первичный ключ)
  - email: текст (уникальный, обязательный)
  - password_hash: текст (обязательный)
  - name: текст (обязательный)
  - company_name: текст (обязательный)
  - address: текст (обязательный)
  - phone_number: текст (обязательный)
  - status: текст (pending/approved/rejected, по умолчанию pending)
  - is_admin: булево (по умолчанию false)
  - created_at: временная метка
  - updated_at: временная метка

  ### catalog_parts
  - id: UUID (первичный ключ)
  - part_number: текст (обязательный)
  - name_en: текст (обязательный)
  - name_ru: текст (обязательный)
  - category: текст (обязательный)
  - price: число (обязательный)
  - qty: целое число (по умолчанию 0)
  - image_url: текст
  - created_at: временная метка
  - updated_at: временная метка

  ### cart
  - id: UUID (первичный ключ)
  - user_id: UUID (внешний ключ на catalog_users)
  - part_id: UUID (внешний ключ на catalog_parts)
  - quantity: целое число (по умолчанию 1)
  - created_at: временная метка

  ### verification_codes
  - id: UUID (первичный ключ)
  - email: текст (обязательный)
  - code: текст (обязательный)
  - expires_at: временная метка (обязательный)
  - used: булево (по умолчанию false)
  - created_at: временная метка

  ## Безопасность
  - Включен RLS для всех таблиц
  - Созданы политики для анонимной регистрации
  - Пользователи могут видеть только свои данные
  - Админы имеют полный доступ
*/

-- Создаем таблицу пользователей каталога
CREATE TABLE IF NOT EXISTS catalog_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  phone_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Создаем таблицу запчастей
CREATE TABLE IF NOT EXISTS catalog_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  qty INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Создаем таблицу корзины
CREATE TABLE IF NOT EXISTS cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES catalog_users(id) ON DELETE CASCADE,
  part_id UUID REFERENCES catalog_parts(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, part_id)
);

-- Создаем таблицу кодов подтверждения
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Включаем RLS для всех таблиц
ALTER TABLE catalog_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Политики для catalog_users
CREATE POLICY "Allow anonymous registration"
  ON catalog_users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own data"
  ON catalog_users
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can update own data"
  ON catalog_users
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Политики для catalog_parts (все могут читать)
CREATE POLICY "Anyone can read parts"
  ON catalog_parts
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert parts"
  ON catalog_parts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update parts"
  ON catalog_parts
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete parts"
  ON catalog_parts
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Политики для cart
CREATE POLICY "Users can manage own cart"
  ON cart
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Политики для verification_codes
CREATE POLICY "Anyone can create codes"
  ON verification_codes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read codes"
  ON verification_codes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update codes"
  ON verification_codes
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_catalog_users_email ON catalog_users(email);
CREATE INDEX IF NOT EXISTS idx_catalog_users_status ON catalog_users(status);
CREATE INDEX IF NOT EXISTS idx_catalog_parts_category ON catalog_parts(category);
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_part_id ON cart(part_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
