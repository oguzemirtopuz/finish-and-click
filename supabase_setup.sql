-- ==============================================================================
-- 1. PROFİLLER TABLOSU
-- (auth.users tablosu direkt erişime kapalı olduğundan, email'leri profillerde tutuyoruz)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- auth.users'a yeni biri kayıt olunca profillere ekleyen Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sadece eğer trigger yoksa oluştur (güvenli oluşturma)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    END IF;
END $$;


-- ==============================================================================
-- 2. WORKSPACE MEMBERS VE INVITES TABLOLARI
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'member'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.workspace_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(workspace_id, email)
);

-- ==============================================================================
-- 3. DAVETLERİ KABUL ETME MANTIĞI (Kayıt olanlar için)
-- ==============================================================================
CREATE OR REPLACE FUNCTION process_invites_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Yeni üye sisteme kayıt olduğunda, ona önceden gönderilmiş davetleri onaylar
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  SELECT workspace_id, NEW.id, 'member'
  FROM public.workspace_invites
  WHERE email = NEW.email;

  -- Onaylanan davetleri temizle
  DELETE FROM public.workspace_invites WHERE email = NEW.email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_profile_created_accept_invites') THEN
        CREATE TRIGGER on_profile_created_accept_invites
        AFTER INSERT ON public.profiles
        FOR EACH ROW EXECUTE PROCEDURE process_invites_for_new_user();
    END IF;
END $$;


-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- (Güvenliği devreye alıp kimin ne görebileceğini ayarlıyoruz)
-- ==============================================================================

-- 4.1 Profil Okuma İzni (Herkes oturum açtığında kendi ve diğer emailleri görebilir - Davet arama için)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are readable by authenticated users." ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users." ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

-- 4.2 Workspaces RLS
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'personal';

-- Eski/Öksüz workspace'leri ilk kayıtlı kullanıcıya zimmmetle (Eğer owner_id NULL ise)
DO $$
DECLARE
  first_user UUID;
BEGIN
  SELECT id INTO first_user FROM public.profiles ORDER BY created_at ASC LIMIT 1;
  IF first_user IS NOT NULL THEN
    UPDATE public.workspaces SET owner_id = first_user WHERE owner_id IS NULL;
  END IF;
END $$;

-- RLS Döngüsünü (Circular Dependency) kırmak için Security Definer fonksiyon
CREATE OR REPLACE FUNCTION public.has_workspace_access(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces WHERE id = ws_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspaces - Select" ON public.workspaces;
CREATE POLICY "Workspaces - Select" ON public.workspaces FOR SELECT 
USING (
  public.has_workspace_access(id)
);

DROP POLICY IF EXISTS "Workspaces - Insert" ON public.workspaces;
CREATE POLICY "Workspaces - Insert" ON public.workspaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Workspaces - Update" ON public.workspaces;
CREATE POLICY "Workspaces - Update" ON public.workspaces FOR UPDATE 
USING (owner_id = auth.uid() OR id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role='owner'));

DROP POLICY IF EXISTS "Workspaces - Delete" ON public.workspaces;
CREATE POLICY "Workspaces - Delete" ON public.workspaces FOR DELETE USING (owner_id = auth.uid());


-- 4.3 Members ve Invites RLS
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members - Select" ON public.workspace_members;
CREATE POLICY "Members - Select" ON public.workspace_members FOR SELECT USING (
  public.has_workspace_access(workspace_id)
);
DROP POLICY IF EXISTS "Members - Insert" ON public.workspace_members;
CREATE POLICY "Members - Insert" ON public.workspace_members FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Invites - All" ON public.workspace_invites;
CREATE POLICY "Invites - All" ON public.workspace_invites FOR ALL USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);


-- 4.4 Task Groups RLS
ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Task Groups - Select" ON public.task_groups;
CREATE POLICY "Task Groups - Select" ON public.task_groups FOR SELECT USING (
  public.has_workspace_access(workspace_id)
);
DROP POLICY IF EXISTS "Task Groups - Insert Update Delete" ON public.task_groups;
CREATE POLICY "Task Groups - Insert Update Delete" ON public.task_groups FOR ALL USING (
  public.has_workspace_access(workspace_id)
) WITH CHECK (
  public.has_workspace_access(workspace_id)
);

-- 4.5 Tasks RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tasks - Select" ON public.tasks;
CREATE POLICY "Tasks - Select" ON public.tasks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.task_groups g
    WHERE g.id = tasks.group_id
    AND public.has_workspace_access(g.workspace_id)
  )
);

DROP POLICY IF EXISTS "Tasks - Insert Update Delete" ON public.tasks;
CREATE POLICY "Tasks - Insert Update Delete" ON public.tasks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.task_groups g
    WHERE g.id = tasks.group_id
    AND public.has_workspace_access(g.workspace_id)
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.task_groups g
    WHERE g.id = group_id
    AND public.has_workspace_access(g.workspace_id)
  )
);

-- ==============================================================================
-- 5. RPC (REMOTE PROCEDURE CALL): E-posta ile Kullanıcı Davet Etme Fonksiyonu
-- ==============================================================================
CREATE OR REPLACE FUNCTION invite_user_by_email(p_workspace_id UUID, p_email TEXT)
RETURNS json AS $$
DECLARE
  v_user_id UUID;
  v_owner_id UUID;
BEGIN
  -- Workspace'in sahibini kontrol et (Sadece sahibi davet edebilir!)
  SELECT owner_id INTO v_owner_id FROM public.workspaces WHERE id = p_workspace_id;
  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Bu çalışma alanına üye davet etme yetkiniz yok!';
  END IF;

  -- Profil tablosunda bu email var mı kontrol et
  SELECT id INTO v_user_id FROM public.profiles WHERE email = p_email;

  IF v_user_id IS NOT NULL THEN
    -- Kullanıcı zaten kayıtlı, direkt members tablosuna ekle
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (p_workspace_id, v_user_id, 'member')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    
    RETURN json_build_object('success', true, 'message', 'Kullanıcı çalışma alanına eklendi!');
  ELSE
    -- Kullanıcı kayıtlı değil, bekleyen davetlere (invites) ekle
    INSERT INTO public.workspace_invites (workspace_id, email, invited_by)
    VALUES (p_workspace_id, p_email, auth.uid())
    ON CONFLICT (workspace_id, email) DO NOTHING;

    RETURN json_build_object('success', true, 'message', 'Kullanıcıya davet oluşturuldu. Kayıt olduğunda otomatik eklenecek.');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 6. SCHEMA RELOAD (ÖNBELLEK TEMİZLEME)
-- (Yabancı anahtar / Foreign key ilişkilerinin API'ye anında yansımasını sağlar)
-- ==============================================================================
NOTIFY pgrst, reload schema;
