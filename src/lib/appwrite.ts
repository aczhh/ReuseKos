import { Client, Account, Databases, Storage } from 'appwrite';

const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
const appwriteProjectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '6a3b674f001d52269d60';


export const client = new Client()
    .setEndpoint(appwriteEndpoint)
    .setProject(appwriteProjectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Constants for Appwrite IDs
export const DATABASE_ID = 'reusekos_db';
export const PROFILES_ID = 'profiles';
export const PRODUCTS_ID = 'products';
export const TRANSACTIONS_ID = 'transactions';
export const CHATS_ID = 'chats';
export const MESSAGES_ID = 'messages';
export const BUCKET_ID = 'reusekos';

export const isAppwriteConfigured =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID !== undefined &&
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID !== 'placeholder';

// Types mapping (We keep the same interface names and fields for compatibility with UI)
export type Profile = {
  id: string; // Mapped from $id
  user_id: string;
  full_name: string;
  email: string;
  jurusan: string;
  whatsapp: string;
  role: 'buyer' | 'seller' | 'driver';
  saldo: number;
  bank_name: string | null;
  bank_account: string | null;
  qris_url: string | null;
  created_at: string; // Mapped from $createdAt
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
  is_promoted?: boolean;
  promoted_until?: string | null;
  created_at: string;
};

export type Transaction = {
  id: string;
  buyer_id: string;
  buyer?: Profile;
  product_id: string;
  product?: Product;
  status: 'pending' | 'paid' | 'completed';
  amount: number;
  delivery_method?: string;
  seller_id: string;
  created_at: string;
};

export type Chat = {
  id: string;
  buyer_id: string;
  buyer?: Profile;
  seller_id: string;
  seller?: Profile;
  product_id: string;
  product?: Product;
  last_message: string;
  last_message_time: string;
  created_at: string;
};

export type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  is_read: boolean;
  created_at: string;
};

// Helper function to map Appwrite document to our UI types
export const mapDoc = <T>(doc: any): T => {
  if (!doc) return doc;
  const { $id, $createdAt, ...rest } = doc;
  return {
    id: $id,
    created_at: $createdAt,
    ...rest,
  } as unknown as T;
};
