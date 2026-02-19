
-- Fix 1: RLS policies for user_roles (no policies existed)
CREATE POLICY "Users can view own roles"  ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles"   ON public.user_roles FOR ALL   USING (public.has_role(auth.uid(), 'admin'));

-- Fix 2: Tighten the overly permissive INSERT on form_responses
-- Allow inserts only for active forms (restrict to public form submission)
DROP POLICY IF EXISTS "Anyone can submit responses" ON public.form_responses;
CREATE POLICY "Anyone can submit to active forms" ON public.form_responses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.forms WHERE forms.id = form_responses.form_id AND forms.status = 'active')
  );

-- Fix 3: Add immutable search_path to update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
