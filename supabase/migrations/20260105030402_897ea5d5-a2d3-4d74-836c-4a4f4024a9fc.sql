-- Allow admins to view all stock notifications
CREATE POLICY "Admins can view all stock notifications"
ON public.stock_notifications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete any stock notification
CREATE POLICY "Admins can delete any stock notification"
ON public.stock_notifications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update stock notifications (for marking as notified)
CREATE POLICY "Admins can update stock notifications"
ON public.stock_notifications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));