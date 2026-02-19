
-- ───────────────────────────────────────────
-- Roles
-- ───────────────────────────────────────────
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role      app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ───────────────────────────────────────────
-- Profiles
-- ───────────────────────────────────────────
CREATE TABLE public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,
  email        TEXT,
  avatar_url   TEXT,
  plan         TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'pro' | 'business'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ───────────────────────────────────────────
-- Forms
-- ───────────────────────────────────────────
CREATE TABLE public.forms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL DEFAULT 'Untitled form',
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'draft',   -- 'draft' | 'active' | 'closed'
  questions        JSONB NOT NULL DEFAULT '[]',
  settings         JSONB NOT NULL DEFAULT '{"showBranding": true, "primaryColor": "hsl(357 95% 22%)"}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own forms"    ON public.forms FOR ALL  USING (auth.uid() = user_id);
CREATE POLICY "Public can view active forms"  ON public.forms FOR SELECT USING (status = 'active');
CREATE POLICY "Admins can view all forms"     ON public.forms FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ───────────────────────────────────────────
-- Form responses
-- ───────────────────────────────────────────
CREATE TABLE public.form_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id     UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  answers     JSONB NOT NULL DEFAULT '[]',
  respondent_email TEXT,
  metadata    JSONB DEFAULT '{}',   -- browser, country, etc.
  completed   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (public forms)
CREATE POLICY "Anyone can submit responses"     ON public.form_responses FOR INSERT WITH CHECK (true);
-- Form owners can read their own responses
CREATE POLICY "Form owners can read responses"  ON public.form_responses FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.forms WHERE forms.id = form_responses.form_id AND forms.user_id = auth.uid())
  );
CREATE POLICY "Admins can read all responses"   ON public.form_responses FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ───────────────────────────────────────────
-- Integrations
-- ───────────────────────────────────────────
CREATE TABLE public.integrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_id     UUID REFERENCES public.forms(id) ON DELETE CASCADE,  -- NULL = applies to all forms
  type        TEXT NOT NULL,   -- 'slack' | 'zapier' | 'email'
  config      JSONB NOT NULL DEFAULT '{}',
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own integrations" ON public.integrations FOR ALL USING (auth.uid() = user_id);

-- ───────────────────────────────────────────
-- Update timestamp trigger
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_forms_updated_at     BEFORE UPDATE ON public.forms        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_profiles_updated_at  BEFORE UPDATE ON public.profiles      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_integrations_updated BEFORE UPDATE ON public.integrations   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
