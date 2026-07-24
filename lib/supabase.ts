import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://owgtfdzmevgeoohnnltg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93Z3RmZHptZXZnZW9vaG5ubHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODk2MTAsImV4cCI6MjA5MzY2NTYxMH0.nF2rxwygpbblaFHXNFzPG_XW78arxgJddcjbmSPsvMM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
