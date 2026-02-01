
import { supabase } from '../lib/supabase';

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 */
export const uploadAchievementImage = async (file: File, userId: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  const filePath = `achievements/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('achievements')
    .upload(fileName, file, {
      upsert: true
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('achievements')
    .getPublicUrl(fileName);

  return data.publicUrl;
};
