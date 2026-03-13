import { supabase } from '../lib/supabase';

const sanitizeFileName = (fileName: string) =>
  fileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');

export const uploadAchievementImage = async (file: File, userId: string): Promise<string> => {
  const extension = file.name.split('.').pop() || 'bin';
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
  const finalName = `${userId}/${Date.now()}-${safeName}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from('achievements').upload(finalName, file, {
    upsert: false,
    cacheControl: '3600',
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from('achievements').getPublicUrl(finalName);
  return data.publicUrl;
};

export const uploadProfileAvatar = async (file: File, userId: string): Promise<string> => {
  const extension = file.name.split('.').pop() || 'png';
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, '') || 'avatar');
  const finalName = `avatars/${userId}/${Date.now()}-${safeName}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from('achievements').upload(finalName, file, {
    upsert: true,
    cacheControl: '3600',
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from('achievements').getPublicUrl(finalName);
  return data.publicUrl;
};
