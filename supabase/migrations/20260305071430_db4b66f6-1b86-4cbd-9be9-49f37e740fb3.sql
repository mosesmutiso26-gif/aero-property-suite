-- Allow all authenticated users to view roles (role is not sensitive data)
CREATE POLICY "Authenticated users can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);