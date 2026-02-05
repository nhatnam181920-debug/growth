import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';  
// 从环境变量读取敏感信息  
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;  
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;  
// 验证环境变量是否存在  
if (!supabaseUrl || !supabaseAnonKey) {  
  throw new Error(  
    'Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file'  
  );  
}  
export const supabase = createClient(supabaseUrl, supabaseAnonKey);  
