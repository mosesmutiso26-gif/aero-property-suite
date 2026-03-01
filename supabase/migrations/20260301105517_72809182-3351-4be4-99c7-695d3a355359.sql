
-- 1. Complaints table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  property_id UUID NOT NULL,
  unit_id UUID NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_complaints_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT fk_complaints_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_complaints_unit FOREIGN KEY (unit_id) REFERENCES public.units(id)
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can do all on complaints" ON public.complaints FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Tenant can create complaints" ON public.complaints FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM tenants t WHERE t.id = complaints.tenant_id AND t.user_id = auth.uid()));
CREATE POLICY "Tenant can view own complaints" ON public.complaints FOR SELECT USING (EXISTS (SELECT 1 FROM tenants t WHERE t.id = complaints.tenant_id AND t.user_id = auth.uid()));
CREATE POLICY "Caretaker can view assigned complaints" ON public.complaints FOR SELECT USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = complaints.property_id AND p.caretaker_id = auth.uid()));
CREATE POLICY "Caretaker can update assigned complaints" ON public.complaints FOR UPDATE USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = complaints.property_id AND p.caretaker_id = auth.uid()));
CREATE POLICY "Landlord can view complaints" ON public.complaints FOR SELECT USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = complaints.property_id AND p.landlord_id = auth.uid()));

CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add account_number to units for M-PESA paybill mapping
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS account_number TEXT;

-- 3. Auto-create tenant record when user gets tenant role
CREATE OR REPLACE FUNCTION public.auto_create_tenant_on_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'tenant' THEN
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE user_id = NEW.user_id AND is_active = true) THEN
      INSERT INTO public.tenants (user_id, is_active) VALUES (NEW.user_id, true);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_tenant_role_assigned
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_tenant_on_role();

-- 4. Auto-update invoice on payment + notify landlord
CREATE OR REPLACE FUNCTION public.on_payment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_name TEXT;
  v_landlord_id UUID;
  v_property_name TEXT;
BEGIN
  -- Update linked invoice if exists
  IF NEW.invoice_id IS NOT NULL THEN
    UPDATE public.invoices SET status = 'paid', updated_at = now() WHERE id = NEW.invoice_id AND status != 'paid';
  END IF;

  -- Get tenant name
  SELECT p.full_name INTO v_tenant_name
  FROM public.tenants t
  JOIN public.profiles p ON p.user_id = t.user_id
  WHERE t.id = NEW.tenant_id;

  -- Get property landlord
  SELECT prop.landlord_id, prop.name INTO v_landlord_id, v_property_name
  FROM public.tenants t
  JOIN public.properties prop ON prop.id = t.property_id
  WHERE t.id = NEW.tenant_id;

  -- Notify landlord
  IF v_landlord_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_landlord_id,
      'Payment Received',
      COALESCE(v_tenant_name, 'A tenant') || ' paid KES ' || NEW.amount || ' via ' || COALESCE(NEW.payment_method, 'unknown') || ' for ' || COALESCE(v_property_name, 'your property'),
      'payment'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_payment_insert
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.on_payment_created();
