
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;

-- Admins can list/view all product image objects via API
CREATE POLICY "Admins can list product images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Note: The bucket remains public, so direct CDN URLs (e.g. /storage/v1/object/public/product-images/<file>)
-- continue to work for displaying images on the storefront. Only enumeration via the list API is restricted.
