
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

const LOCAL_PROFILE_KEY = 'unipath_profile_cache_';

/**
 * 获取用户信息，并合并本地缓存（处理数据库 Schema 不匹配的情况）
 */
export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    let profile = data as UserProfile;

    // 尝试合并本地备份数据（处理数据库缺失字段的情况）
    const localData = localStorage.getItem(LOCAL_PROFILE_KEY + userId);
    if (localData) {
      const parsedLocal = JSON.parse(localData);
      profile = { ...profile, ...parsedLocal };
    }

    if (error && !profile) {
      console.log('Profile fetch note:', error.message);
      return null;
    }
    return profile;
  } catch (e) {
    return null;
  }
};

/**
 * 更新用户信息：
 * 1. 尝试全量更新。
 * 2. 若失败（Schema 不匹配），则进行基础字段更新，并将扩展字段持久化到 LocalStorage。
 * 3. 始终确保逻辑不中断，提升用户体验。
 */
export const updateProfile = async (profile: Partial<UserProfile> & { id: string }): Promise<{ success: boolean; schemaIssue: boolean }> => {
  const userId = profile.id;
  
  // 备份扩展字段到本地，防止数据库 Schema 缺失导致的数据丢失
  const extendedFields = {
    personalAdvantages: profile.personalAdvantages,
    techPlanning: profile.techPlanning,
    // Fixed: Property 'avatar_url' is now available on UserProfile via types.ts update
    avatar_url: profile.avatar_url
  };
  localStorage.setItem(LOCAL_PROFILE_KEY + userId, JSON.stringify(extendedFields));

  // 1. 尝试全量更新
  const { error } = await supabase
    .from('profiles')
    .upsert(profile);

  if (error) {
    const errorMsg = typeof error === 'object' ? (error as any).message || JSON.stringify(error) : String(error);
    
    // 如果是数据库列缺失错误
    if (errorMsg.includes('column') || errorMsg.includes('schema cache')) {
      console.warn('DB Schema incomplete, falling back to basic fields + local storage.');
      
      // 2. 剥离可能失效的扩展字段，仅保存核心基础字段
      const { 
        personalAdvantages, 
        techPlanning, 
        avatar_url, 
        birthYear,
        ...basicProfile 
      } = profile as any;
      
      const { error: retryError } = await supabase
        .from('profiles')
        .upsert(basicProfile);
        
      if (retryError) {
        throw new Error(`Critical DB update failure: ${retryError.message}`);
      }

      return { success: true, schemaIssue: true };
    }
    throw new Error(errorMsg);
  }

  return { success: true, schemaIssue: false };
};
