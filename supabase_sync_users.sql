-- ==============================================================================
-- SUPABASE KULLANICI VE GÖREV OLUŞTURUCU (CREATOR) SENKRONİZASYON MİGRASYONU
-- ==============================================================================
-- Bu migration:
-- 1. Mevcut auth.users kullanıcılarını public.users tablosuna güvenle senkronize eder.
-- 2. tasks.created_by foreign key ilişkisini (tasks_created_by_fkey -> users(id)) bozmaz.
-- 3. Hiçbir kullanıcıyı veya görevi silmez (non-destructive).
-- 4. Yeni kaydolan kullanıcıların hem profiles hem users tablosuna eklenmesini sağlar.
-- 5. public.users tablosunun oturum açmış kullanıcılarca okunabilmesini sağlar.
-- ==============================================================================

-- 1. Mevcut auth.users kullanıcılarını public.users tablosuna senkronize et
INSERT INTO public.users (id, email, name, auth_id, created_at)
SELECT 
  u.id, 
  u.email, 
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.id,
  u.created_at
FROM auth.users u
ON CONFLICT (id) DO UPDATE 
SET 
  email = EXCLUDED.email, 
  auth_id = EXCLUDED.auth_id,
  name = COALESCE(public.users.name, EXCLUDED.name);

-- 2. Yeni kullanıcılar kaydolduğunda public.users tablosunu da otomatik güncelleyen trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_sync() 
RETURNS TRIGGER AS $$
BEGIN
  -- public.profiles tablosuna ekle
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  -- public.users tablosuna da ekle (böylece tasks.created_by FK asla hata vermez)
  INSERT INTO public.users (id, email, name, auth_id)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.id
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    email = EXCLUDED.email, 
    auth_id = EXCLUDED.auth_id,
    name = COALESCE(public.users.name, EXCLUDED.name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı auth.users üzerine tanımla
DROP TRIGGER IF EXISTS on_auth_user_created_sync ON auth.users;
CREATE TRIGGER on_auth_user_created_sync
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_sync();

-- 3. public.users tablosu için RLS: Giriş yapmış kullanıcılar e-posta ve isimleri okuyabilsin
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users are readable by authenticated users." ON public.users;
CREATE POLICY "Users are readable by authenticated users." ON public.users 
FOR SELECT USING (auth.role() = 'authenticated');

-- 4. PostgREST şema önbelleğini yenile
NOTIFY pgrst, 'reload schema';
