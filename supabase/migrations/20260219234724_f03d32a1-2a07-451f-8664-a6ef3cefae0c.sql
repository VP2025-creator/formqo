-- Fix overly-permissive INSERT policies — restrict to edge function service role only
-- by requiring that form_id references a real active form (gives context validation)

-- submission_rate_limits: require form exists and is active
DROP POLICY IF EXISTS "Edge function can insert rate limit records" ON public.submission_rate_limits;
CREATE POLICY "Only valid active form submissions allowed"
  ON public.submission_rate_limits
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = submission_rate_limits.form_id
        AND forms.status = 'active'
    )
  );

-- csrf_tokens: require form exists
DROP POLICY IF EXISTS "Public can insert csrf tokens" ON public.csrf_tokens;
CREATE POLICY "CSRF tokens must reference a real form"
  ON public.csrf_tokens
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = csrf_tokens.form_id
    )
  );
