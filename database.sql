-- 1. Create Profiles table
CREATE TABLE public.profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  jurusan TEXT,
  whatsapp TEXT,
  role TEXT CHECK (role IN ('buyer', 'seller', 'driver')) NOT NULL,
  saldo NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create Products table
CREATE TABLE public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL,
  photos TEXT[] DEFAULT '{}',
  video_url TEXT,
  conditions TEXT[] DEFAULT '{}',
  lat NUMERIC,
  lng NUMERIC,
  address TEXT,
  is_sold BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Create Transactions table
CREATE TABLE public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  delivery_method TEXT CHECK (delivery_method IN ('pickup', 'deliver')) NOT NULL,
  distance_km NUMERIC DEFAULT 0,
  ongkir NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  seller_cut NUMERIC NOT NULL,
  driver_cut NUMERIC NOT NULL,
  admin_cut NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('pending', 'paid', 'in_delivery', 'completed', 'cancelled')) DEFAULT 'pending' NOT NULL,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Setup RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Products Policies
CREATE POLICY "Products are viewable by everyone." ON public.products FOR SELECT USING (true);
CREATE POLICY "Users can insert their own products." ON public.products FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can update own products." ON public.products FOR UPDATE USING (auth.uid() = seller_id);

-- Transactions Policies
CREATE POLICY "Users can view their own transactions (buyer or seller)." ON public.transactions FOR SELECT USING (
  auth.uid() = buyer_id OR 
  auth.uid() IN (SELECT seller_id FROM public.products WHERE id = product_id)
);
CREATE POLICY "Buyers can insert transactions." ON public.transactions FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants can update transactions." ON public.transactions FOR UPDATE USING (
  auth.uid() = buyer_id OR 
  auth.uid() IN (SELECT seller_id FROM public.products WHERE id = product_id)
);

-- Setup Storage Bucket for ReuseKos (Photos/Videos)
INSERT INTO storage.buckets (id, name, public) VALUES ('reusekos', 'reusekos', true);

CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'reusekos');
CREATE POLICY "Anyone can upload an image/video." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'reusekos' AND auth.role() = 'authenticated');
