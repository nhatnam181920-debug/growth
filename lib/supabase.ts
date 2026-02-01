
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 这是您的 Supabase 项目地址
const supabaseUrl = 'https://qukufjigazwwrhtgiesu.supabase.co';

/**
 * 重要提示：
 * 请前往 Supabase Dashboard -> Project Settings -> API
 * 复制 "Project API keys" 下方标有 "anon" "public" 的那个【非常长】的字符串。
 * 它应该以 "eyJ..." 开头。
 * 
 * 不要使用以 "sb_publishable_" 开头的 Key，那是其他服务的格式。
 */
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1a3VmamlnYXp3d3JodGdpZXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDMwNjQsImV4cCI6MjA4MjM3OTA2NH0.xe1sZvvB9uBhrCBe8s8zt-10yCn4BL5hYeAYil3SPIk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
