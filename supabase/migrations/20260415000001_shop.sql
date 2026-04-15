-- Shop Products
CREATE TABLE IF NOT EXISTS public.shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  images TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'egyéb',
  in_stock BOOLEAN DEFAULT true,
  stock_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read products" ON public.shop_products
  FOR SELECT USING (true);

CREATE POLICY "Admin and shop_manager can manage products" ON public.shop_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'shop_manager')
    )
  );

-- Shop Orders
CREATE TABLE IF NOT EXISTS public.shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_zip TEXT NOT NULL,
  shipping_method TEXT DEFAULT 'post',
  payment_method TEXT DEFAULT 'transfer',
  status TEXT DEFAULT 'pending',
  total_price INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own orders" ON public.shop_orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read own orders" ON public.shop_orders
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'shop_manager')
    )
  );

CREATE POLICY "Admin and shop_manager can update orders" ON public.shop_orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'shop_manager')
    )
  );

-- Shop Order Items
CREATE TABLE IF NOT EXISTS public.shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.shop_products(id),
  product_name TEXT NOT NULL,
  product_price INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  custom_note TEXT
);

ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert order items" ON public.shop_order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read order items" ON public.shop_order_items
  FOR SELECT USING (true);

-- Shop Settings (single row)
CREATE TABLE IF NOT EXISTS public.shop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT DEFAULT '',
  bank_account TEXT DEFAULT '',
  bank_account_holder TEXT DEFAULT '',
  shipping_price INTEGER DEFAULT 1500,
  free_shipping_above INTEGER DEFAULT 15000,
  shop_email TEXT DEFAULT '',
  shop_phone TEXT DEFAULT '',
  shop_open BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shop settings" ON public.shop_settings
  FOR SELECT USING (true);

CREATE POLICY "Admin and shop_manager can update settings" ON public.shop_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'shop_manager')
    )
  );

INSERT INTO public.shop_settings (bank_name, bank_account, bank_account_holder, shipping_price, free_shipping_above)
VALUES ('', '', '', 1500, 15000)
ON CONFLICT DO NOTHING;

-- Grant shop_manager role function (admin only)
CREATE OR REPLACE FUNCTION public.grant_shop_manager(p_email TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_email;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'shop_manager')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_shop_manager(p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = 'shop_manager';
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_shop_manager(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_shop_manager(UUID) TO authenticated;
