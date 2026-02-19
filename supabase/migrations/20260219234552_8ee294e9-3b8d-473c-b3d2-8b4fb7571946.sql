-- ─── 1. Auto-assign admin role on signup for tverdin999@gmail.com ────────────

-- Function that fires on new user insert
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-assign admin role to the designated admin email
  IF NEW.email = 'tverdin999@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Assign default user role to everyone else
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- ─── 2. Rate limiting table for form submissions ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.submission_rate_limits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id     uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  ip_hash     text NOT NULL,                -- SHA-256 of submitter IP (privacy-safe)
  submitted_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.submission_rate_limits ENABLE ROW LEVEL SECURITY;

-- Public insert allowed (edge function uses service role, but keep RLS consistent)
CREATE POLICY "Edge function can insert rate limit records"
  ON public.submission_rate_limits
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Form owners can read rate limits"
  ON public.submission_rate_limits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = submission_rate_limits.form_id
        AND forms.user_id = auth.uid()
    )
  );

-- Index for fast lookups (per-form, per-ip, per time window)
CREATE INDEX IF NOT EXISTS idx_rate_limits_form_ip_time
  ON public.submission_rate_limits (form_id, ip_hash, submitted_at);

-- Auto-delete records older than 24 hours to keep table small
-- (handled by the edge function; also useful as a cleanup policy)

-- ─── 3. Per-form submission limit column on forms ────────────────────────────

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS max_responses integer DEFAULT NULL,        -- NULL = unlimited
  ADD COLUMN IF NOT EXISTS allowed_domains text[] DEFAULT NULL,       -- NULL = any domain
  ADD COLUMN IF NOT EXISTS captcha_enabled boolean NOT NULL DEFAULT true;

-- ─── 4. CSRF token table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.csrf_tokens (
  token       text PRIMARY KEY,
  form_id     uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  used        boolean NOT NULL DEFAULT false
);

ALTER TABLE public.csrf_tokens ENABLE ROW LEVEL SECURITY;

-- Edge function (service role) manages these — public can only read by token
CREATE POLICY "Public can verify csrf tokens"
  ON public.csrf_tokens
  FOR SELECT
  USING (true);

CREATE POLICY "Public can insert csrf tokens"
  ON public.csrf_tokens
  FOR INSERT
  WITH CHECK (true);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_form_id ON public.csrf_tokens (form_id);

-- Auto-expire old tokens after 2 hours via a cleanup approach
-- (edge function marks as used; old tokens cleaned by scheduled job or edge function)
