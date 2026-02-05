import { supabase } from '../lib/supabase';  
import { UserProfile } from '../types';  
/**  
 * 获取用户信息  
 * 注意：敏感数据应该从服务器获取，不应该存储在 localStorage  
 */  
export const getProfile = async (userId: string): Promise<UserProfile | null> => {  
  try {  
    const { data, error } = await supabase  
      .from('profiles')  
      .select('*')  
      .eq('id', userId)  
      .single();  
    if (error) {  
      console.log('Profile fetch note:', error.message);  
      return null;  
    }  
    return data as UserProfile;  
  } catch (e) {  
    console.error('Error fetching profile:', e);  
    return null;  
  }  
};  
/**  
 * 更新用户信息  
 * 所有敏感数据都应该通过 HTTPS 发送到服务器  
 */  
export const updateProfile = async (  
  profile: Partial<UserProfile> & { id: string }  
): Promise<{ success: boolean; error?: string }> => {  
  try {  
    const { error } = await supabase  
      .from('profiles')  
      .upsert(profile);  
    if (error) {  
      const errorMsg = typeof error === 'object'   
        ? (error as any).message || JSON.stringify(error)   
        : String(error);  
        
      console.error('Profile update error:', errorMsg);  
      return { success: false, error: errorMsg };  
    }  
    return { success: true };  
  } catch (e) {  
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';  
    console.error('Error updating profile:', errorMsg);  
    return { success: false, error: errorMsg };  
  }  
};  
/**  
 * 只在 localStorage 中存储非敏感的 UI 偏好设置  
 */  
export const saveUIPreferences = (userId: string, preferences: Record<string, any>) => {  
  const key = `unipath_ui_prefs_${userId}`;  
  localStorage.setItem(key, JSON.stringify(preferences));  
};  
/**  
 * 获取 UI 偏好设置  
 */  
export const getUIPreferences = (userId: string): Record<string, any> => {  
  const key = `unipath_ui_prefs_${userId}`;  
  const stored = localStorage.getItem(key);  
  return stored ? JSON.parse(stored) : {};  
};  
/**  
 * 清除所有本地数据（登出时调用）  
 */  
export const clearLocalData = (userId: string) => {  
  const key = `unipath_ui_prefs_${userId}`;  
  localStorage.removeItem(key);  
};  
