import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Briefcase,
  CheckCircle2,
  DollarSign,
  Loader2,
  MapPin,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { Experience, Job, MatchResult, Skill } from '../types';
import { fetchLatestJobs } from '../services/jobService';
import { matchJobToProfile } from '../services/aiService';

interface JobBoardProps {
  experiences: Experience[];
  skills: Skill[];
}

const getTypeLabel = (type: string) => (type === 'Internship' ? '实习' : '全职');

const toSafeExternalUrl = (value?: string) => {
  if (!value) {
    return null;
  }

  try {
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};

export const JobBoard: React.FC<JobBoardProps> = ({ experiences, skills }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadJobs = async () => {
      setIsLoadingJobs(true);
      const data = await fetchLatestJobs();

      if (!mounted) {
        return;
      }

      setJobs(data);
      setIsLoadingJobs(false);
    };

    void loadJobs();

    return () => {
      mounted = false;
    };
  }, []);

  const handleMatch = async (job: Job) => {
    setSelectedJob(job);
    setMatchResult(null);
    setIsMatching(true);

    try {
      const result = await matchJobToProfile(job, experiences, skills);
      setMatchResult(result);
    } catch (error) {
      console.error('Job match failed:', error);
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            精准实习匹配
          </h2>
          <p className="mt-2 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
            AI-Powered Internship Matching
          </p>
        </div>

        <div className="rounded-[24px] border border-indigo-100 bg-indigo-50 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
          共 {jobs.length} 个岗位
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8">
        <section className="xl:col-span-5">
          <div className="custom-scrollbar rounded-[36px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6 xl:max-h-[calc(100vh-320px)] xl:overflow-y-auto xl:pr-3">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-blue-50 text-blue-600">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">短期项目 / 日常实习 / 暑期实习</h3>
                <p className="text-xs font-semibold text-slate-400">点击卡片生成精准实习匹配分析</p>
              </div>
            </div>

            {isLoadingJobs ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm font-semibold text-slate-400">
                暂无岗位数据
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => void handleMatch(job)}
                    className={`w-full rounded-[28px] border p-5 text-left transition-all ${
                      selectedJob?.id === job.id
                        ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100/60'
                        : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h4 className="text-base font-black text-slate-900">{job.title}</h4>
                        <p className="mt-2 text-sm font-semibold text-slate-500">{job.company}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                        {getTypeLabel(job.type)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5" />
                        {job.salary}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {job.requirements.slice(0, 4).map((requirement) => (
                        <span
                          key={requirement}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-600"
                        >
                          {requirement}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="xl:col-span-7">
          <div className="flex min-h-[420px] flex-col overflow-hidden rounded-[36px] border border-slate-100 bg-white shadow-sm">
            {!selectedJob ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <Briefcase className="mb-4 h-14 w-14 text-slate-200" />
                <p className="text-lg font-black text-slate-700">选择一个岗位开始分析</p>
                <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-400">
                  系统会结合你的成果经历和技能标签，自动给出匹配分数、优势点和补齐建议。
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 bg-slate-50 px-6 py-5 sm:px-8">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">{selectedJob.title}</h3>
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        {selectedJob.company} · {selectedJob.location}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                      {getTypeLabel(selectedJob.type)}
                    </span>
                  </div>
                </div>

                <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto p-6 sm:p-8">
                  <section>
                    <h4 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                      职位描述
                    </h4>
                    <p className="text-sm font-medium leading-7 text-slate-700">
                      {selectedJob.description}
                    </p>
                  </section>

                  <section className="rounded-[30px] border border-indigo-100 bg-indigo-50 p-5 sm:p-6">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-indigo-800">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        AI 匹配深度分析
                      </h4>
                      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">
                        {isMatching ? 'Analyzing' : 'Ready'}
                      </span>
                    </div>

                    {isMatching ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                      </div>
                    ) : matchResult ? (
                      <div className="space-y-6">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                          <div className="relative h-24 w-24 shrink-0">
                            <svg className="h-full w-full" viewBox="0 0 36 36">
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#c7d2fe"
                                strokeWidth="3"
                              />
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#4f46e5"
                                strokeWidth="3"
                                strokeDasharray={`${matchResult.score}, 100`}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-indigo-900">
                              {matchResult.score}%
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-lg font-black text-indigo-900">
                              {matchResult.score >= 80
                                ? '高度匹配，建议尽快投递'
                                : matchResult.score >= 60
                                  ? '具备较强潜力，可补强后投递'
                                  : '当前差距较大，建议先集中补齐能力'}
                            </p>
                            <p className="text-sm font-medium leading-relaxed text-indigo-700">
                              {matchResult.advice}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="rounded-[24px] border border-green-100 bg-white p-4">
                            <h5 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-green-700">
                              <CheckCircle2 className="h-4 w-4" />
                              已匹配能力
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {matchResult.matchingSkills.length > 0 ? (
                                matchResult.matchingSkills.map((skill) => (
                                  <span
                                    key={skill}
                                    className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-bold text-green-700"
                                  >
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs font-semibold text-slate-400">
                                  暂无直接重合项
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-red-100 bg-white p-4">
                            <h5 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-red-700">
                              <XCircle className="h-4 w-4" />
                              待补齐能力
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {matchResult.missingSkills.length > 0 ? (
                                matchResult.missingSkills.map((skill) => (
                                  <span
                                    key={skill}
                                    className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700"
                                  >
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs font-semibold text-slate-400">
                                  当前暂无明显缺口
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-700">
                            <BookOpen className="h-4 w-4 text-indigo-500" />
                            个性化提升建议
                          </h5>
                          <div className="space-y-3">
                            {matchResult.recommendations.length > 0 ? (
                              matchResult.recommendations.map((recommendation) => {
                                const safeUrl = toSafeExternalUrl(recommendation.url);

                                return (
                                  <div
                                    key={recommendation.id}
                                    className="flex flex-col gap-4 rounded-[24px] border border-indigo-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div>
                                      <p className="text-sm font-black text-slate-900">
                                        {recommendation.title}
                                      </p>
                                      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                                        {recommendation.platform} · {recommendation.reason}
                                      </p>
                                    </div>

                                    {safeUrl ? (
                                      <a
                                        href={safeUrl}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-indigo-600 transition-all hover:bg-indigo-600 hover:text-white"
                                      >
                                        查看资源
                                      </a>
                                    ) : (
                                      <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                                        暂无链接
                                      </span>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="rounded-[24px] border border-dashed border-indigo-100 bg-white px-4 py-6 text-sm font-medium text-slate-400">
                                当前无需额外推荐资源，建议直接围绕已有经历优化简历并投递。
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-indigo-100 bg-white px-5 py-8 text-center text-sm font-medium text-slate-500">
                        点击左侧岗位卡片后，系统会生成匹配分数、技能差距和学习建议。
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 999px;
        }
      `}</style>
    </div>
  );
};
