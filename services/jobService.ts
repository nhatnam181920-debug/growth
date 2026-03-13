import { supabase } from '../lib/supabase';
import { MOCK_JOBS } from '../constants';
import { Job } from '../types';

const mergeJobs = (jobs: Job[]) => {
  const map = new Map<string, Job>();

  for (const job of [...jobs, ...MOCK_JOBS]) {
    map.set(job.id, job);
  }

  return Array.from(map.values());
};

export const fetchLatestJobs = async (): Promise<Job[]> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      console.warn('Supabase jobs 表为空，已切换为本地演示岗位数据。');
      return MOCK_JOBS;
    }

    return mergeJobs(data as Job[]);
  } catch (error) {
    console.warn('Job fetch failed, using mock jobs instead:', error);
    return MOCK_JOBS;
  }
};
