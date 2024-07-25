import { createClient } from '@supabase/supabase-js';

const dbUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!dbUrl || !anonKey) {
  throw new Error('Supabase environment variables are not set');
}

export const supabase = createClient(dbUrl, anonKey);