
-- Add notes column to payments
ALTER TABLE public.payments ADD COLUMN notes text DEFAULT '';

-- Allow caretakers to insert payments for tenants in their assigned properties
CREATE POLICY "Caretaker can insert payments in assigned properties"
ON public.payments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenants t
    JOIN properties p ON p.id = t.property_id
    WHERE t.id = payments.tenant_id AND p.caretaker_id = auth.uid()
  )
);
