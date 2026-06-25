import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : 'https://placeholder.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('your_')
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('your_');

export type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  jurusan: string;
  whatsapp: string;
  role: 'buyer' | 'seller' | 'driver';
  saldo: number;
  created_at: string;
};

export type Product = {
  id: string;
  seller_id: string;
  seller?: Profile;
  title: string;
  description: string;
  price: number;
  category: string;
  photos: string[];
  video_url: string | null;
  conditions: string[];
  lat: number;
  lng: number;
  address: string;
  is_sold: boolean;
  created_at: string;
};

export type Transaction = {
  id: string;
  buyer_id: string;
  buyer?: Profile;
  product_id: string;
  product?: Product;
  delivery_method: 'pickup' | 'deliver';
  distance_km: number;
  ongkir: number;
  total_amount: number;
  seller_cut: number;
  driver_cut: number;
  admin_cut: number;
  status: 'pending' | 'paid' | 'in_delivery' | 'completed' | 'cancelled';
  driver_id: string | null;
  driver?: Profile;
  payment_token: string | null;
  created_at: string;
};
