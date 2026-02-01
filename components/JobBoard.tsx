
import React, { useState, useEffect } from 'react';
import { Job, Experience, Skill, MatchResult } from '../types';
import { matchJobToProfile } from '../services/geminiService';
import { fetchLatestJobs } from '../services/jobService';
import { Briefcase, MapPin, DollarSign, CheckCircle2, XCircle, BookOpen, Loader2, Sparkles } from 'lucide-react';

interface JobBoardProps {
  experiences: Experience[];
  skills: Skill[];
}

export const JobBoard: React.FC<JobBoardProps> = ({ experiences, skills }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  useEffect(() => {
    const loadJobs = async () => {
      setIsLoadingJobs(true);
      const data = await fetchLatestJobs();
      setJobs(data);
      setIsLoadingJobs(false);
    };
    loadJobs();
  }, []);

  const handleMatch = async (job: Job) => {
    setSelectedJob(job);
    setIsMatching(true);
    setMatchResult(null);
    try {
      const result = await matchJobToProfile(job, experiences, skills);
      setMatchResult(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsMatching(false);
    }
  };

  const getTypeLabel = (type: string) => {
      return type === 'Internship' ? '校招/实习' : '社会招聘';
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-240px)] animate-fade-in">
      <div className="lg:col-span-5 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
        <h2 className="text-xl font-bold text-slate-800 mb-4">精选校招与实习机会</h2>
        {isLoadingJobs ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-10 text-slate-400">暂无职位发布</div>
        ) : (
          jobs.map((job) => (
            <div 
              key={job.id}
              onClick={() => handleMatch(job)}
              className={`p-5 rounded-xl border cursor-pointer transition-all duration-200 ${
                  selectedJob?.id === job.id 
                  ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' 
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-800">{job.title}</h3>
                  <span className="text-xs font-semibold bg-slate-200 text-slate-700 px-2 py-1 rounded">{getTypeLabel(job.type)}</span>
              </div>
              <p className="text-slate-600 font-medium text-sm mb-3">{job.company}</p>
              <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {job.salary}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                  {job.requirements.slice(0, 3).map((req, i) => (
                      <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                          {req}
                      </span>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="lg:col-span-7 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
        {!selectedJob ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <Briefcase className="w-16 h-16 mb-4 opacity-20" />
                <p>请在左侧选择职位，开启您的 AI 匹配度测评。</p>
            </div>
        ) : (
            <div className="flex flex-col h-full">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <h2 className="text-2xl font-bold text-slate-800">{selectedJob.title}</h2>
                    <p className="text-slate-600 font-semibold">{selectedJob.company}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    <div>
                        <h4 className="font-bold text-slate-800 mb-2">职位详情描述</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{selectedJob.description}</p>
                    </div>

                    <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-600" />
                                AI 简历匹配度深度分析
                            </h3>
                            {isMatching && <span className="text-xs text-indigo-600 animate-pulse font-medium">深度解析职场适配中...</span>}
                        </div>

                        {isMatching ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                            </div>
                        ) : matchResult ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-6">
                                    <div className="relative w-20 h-20 flex items-center justify-center">
                                        <svg className="w-full h-full" viewBox="0 0 36 36">
                                            <path
                                                className="text-indigo-200"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                            />
                                            <path
                                                className="text-indigo-600 drop-shadow-md"
                                                strokeDasharray={`${matchResult.score}, 100`}
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                            />
                                        </svg>
                                        <span className="absolute text-lg font-bold text-indigo-900">{matchResult.score}%</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-indigo-900 text-lg">{matchResult.score >= 80 ? '高度适配：即刻投递!' : matchResult.score >= 50 ? '潜力适配：建议加强' : '匹配度一般：尚需积累'}</p>
                                        <p className="text-xs text-indigo-700 mt-1 leading-relaxed">{matchResult.advice}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-3 rounded-lg border border-green-100">
                                        <h5 className="text-xs font-bold text-green-700 uppercase mb-2 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> 完美匹配能力
                                        </h5>
                                        <div className="flex flex-wrap gap-1">
                                            {matchResult.matchingSkills.map(s => <span key={s} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-bold">{s}</span>)}
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-red-100">
                                        <h5 className="text-xs font-bold text-red-700 uppercase mb-2 flex items-center gap-1">
                                            <XCircle className="w-3 h-3" /> 关键能力缺口
                                        </h5>
                                        <div className="flex flex-wrap gap-1">
                                            {matchResult.missingSkills.map(s => <span key={s} className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold">{s}</span>)}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h5 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-indigo-500" />
                                        个性化提升课程推荐
                                    </h5>
                                    <div className="space-y-2">
                                        {matchResult.recommendations.map((rec, idx) => (
                                            <div key={idx} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex justify-between items-center group hover:border-indigo-300 transition-all">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{rec.title}</p>
                                                    <p className="text-[11px] text-slate-500">{rec.platform} • {rec.reason}</p>
                                                </div>
                                                <a href={rec.url || "#"} target="_blank" className="text-xs bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    去提升
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        )}
      </div>
      <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
      `}</style>
    </div>
  );
};
