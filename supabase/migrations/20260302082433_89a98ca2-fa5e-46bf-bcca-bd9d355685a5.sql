
-- Allow caretakers to insert tenants into their assigned properties
CREATE POLICY "Caretaker can insert tenants in assigned properties"
ON public.tenants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = tenants.property_id AND p.caretaker_id = auth.uid()
  )
);

-- Allow caretakers to update tenants in their assigned properties
CREATE POLICY "Caretaker can update tenants in assigned properties"
ON public.tenants
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = tenants.property_id AND p.caretaker_id = auth.uid()
  )
);

-- Allow caretakers to view payments for tenants in their assigned properties
CREATE POLICY "Caretaker can view payments in assigned properties"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tenants t
    JOIN properties p ON p.id = t.property_id
    WHERE t.id = payments.tenant_id AND p.caretaker_id = auth.uid()
  )
);

-- Allow caretakers to view invoices for tenants in their assigned properties
CREATE POLICY "Caretaker can view invoices in assigned properties"
ON public.invoices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tenants t
    JOIN properties p ON p.id = t.property_id
    WHERE t.id = invoices.tenant_id AND p.caretaker_id = auth.uid()
  )
);

-- Allow caretakers to view units in their assigned properties (they already can via existing policy, but let's ensure)
