import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please check your environment variables.');
}

console.log('Supabase Initialized with URL:', supabaseUrl);
console.log('Supabase Key Prefix:', supabaseAnonKey?.substring(0, 15));

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);
