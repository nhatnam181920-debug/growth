import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

const LOCAL_PROFILE_KEY = 'unipath_profile_cache_';

const safeStorageRead = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Partial<UserProfile>) : null;
  } catch (error) {
    console.warn('Failed to parse cached profile:', error);
    return null;
  }
};

const persistExtendedFields = (profile: Partial<UserProfile> & { id: string }) => {
  const cachePayload: Partial<UserProfile> = {
    personalAdvantages: profile.personalAdvantages,
    techPlanning: profile.techPlanning,
    avatar_url: profile.avatar_url,
    birthYear: profile.birthYear,
    ethnicity: profile.ethnicity,
    jobTarget: profile.jobTarget,
  };

  try {
    localStorage.setItem(LOCAL_PROFILE_KEY + profile.id, JSON.stringify(cachePayload));
  } catch (error) {
    console.warn('Failed to cache profile locally:', error);
  }
};

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

    if (error && !data) {
      console.warn('Profile fetch note:', error.message);
    }

    const cached = safeStorageRead(LOCAL_PROFILE_KEY + userId);
    const merged = { ...(data ?? {}), ...(cached ?? {}) } as UserProfile;

    return Object.keys(merged).length > 0 ? merged : null;
  } catch (error) {
    console.warn('Profile fetch failed:', error);
    return safeStorageRead(LOCAL_PROFILE_KEY + userId) as UserProfile | null;
  }
};

export const updateProfile = async (
  profile: Partial<UserProfile> & { id: string },
): Promise<{ success: boolean; schemaIssue: boolean }> => {
  persistExtendedFields(profile);

  const { error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' });

  if (!error) {
    return { success: true, schemaIssue: false };
  }

  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: string }).message || '')
      : String(error);

  if (!message.includes('column') && !message.includes('schema cache')) {
    throw new Error(message || '保存档案失败，请稍后重试。');
  }

  const {
    personalAdvantages,
    techPlanning,
    avatar_url,
    birthYear,
    ethnicity,
    jobTarget,
    ...basicProfile
  } = profile as UserProfile & { id: string };

  const { error: retryError } = await supabase.from('profiles').upsert(basicProfile, {
    onConflict: 'id',
  });

  if (retryError) {
    throw new Error(retryError.message || '保存档案失败，请检查 Supabase profiles 表结构。');
  }

  return { success: true, schemaIssue: true };
};
