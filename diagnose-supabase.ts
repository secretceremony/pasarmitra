import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

async function runDiagnostics() {
  console.log('--- Supabase Diagnostics ---');
  console.log('URL:', supabaseUrl);
  console.log('Key starts with:', supabaseAnonKey?.substring(0, 15));
  
  // 1. Check Auth Status
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.log('Auth Check (getUser): Failed as expected (no session), but error was:', error.message);
    } else {
      console.log('Auth Check (getUser): Success, user is:', data.user?.email);
    }
  } catch (e) {
    console.error('Auth Check (getUser): Fatal error:', e);
  }

  // 2. Check Database Access
  try {
    const { data, error, status } = await supabase.from('profiles').select('*').limit(1);
    console.log('Database Check (profiles): Status', status, error ? 'Error: ' + error.message : 'Success');
  } catch (e) {
    console.error('Database Check (profiles): Fatal error:', e);
  }
}

runDiagnostics();
