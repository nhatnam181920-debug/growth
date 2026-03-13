import { createClient } from '@supabase/supabase-js';

const resolveEnv = (value: string | undefined, fallback: string) => value?.trim() || fallback;

const supabaseUrl = resolveEnv(
  import.meta.env.VITE_SUPABASE_URL,
  'https://qukufjigazwwrhtgiesu.supabase.co',
);

const supabaseAnonKey = resolveEnv(
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1a3VmamlnYXp3d3JodGdpZXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDMwNjQsImV4cCI6MjA4MjM3OTA2NH0.xe1sZvvB9uBhrCBe8s8zt-10yCn4BL5hYeAYil3SPIk',
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
