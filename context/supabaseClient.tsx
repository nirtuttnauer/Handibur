// @ts-ignore
import { SUPABASE_URL, SUPABASE_PUBLIC_KEY } from '@env';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const dbUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!dbUrl || !anonKey) {
  throw new Error('Supabase environment variables are not set');
}

export const supabase = createClient(dbUrl, anonKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})