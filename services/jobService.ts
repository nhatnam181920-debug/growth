
import { supabase } from '../lib/supabase';
import { Job } from '../types';
import { MOCK_JOBS } from '../constants';

export const fetchLatestJobs = async (): Promise<Job[]> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error || !data || data.length === 0) {
      console.warn('数据库职位表为空或未找到，切换至本地演示数据');
      return MOCK_JOBS;
    }
    return data as Job[];
  } catch (err) {
    console.error('Job Fetch Error:', err);
    return MOCK_JOBS;
  }
};
