
import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';
import { Sparkles, Trophy, Flag, Lock, Loader2, ArrowRight } from 'lucide-react';
import { Experience, Skill } from '../types';
import { generateGrowthSummary } from '../services/geminiService';

interface GrowthDashboardProps {
  experiences: Experience[];
  skills: Skill[];
  userProfile?: any;
}

export const GrowthDashboard: React.FC<GrowthDashboardProps> = ({ experiences, skills, userProfile }) => {
  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    try {
        const result = await generateGrowthSummary(experiences);
        setSummary(result);
    } catch (e) { console.error(e); }
    finally { setLoadingSummary(false); }
  };

  const sortedExperiences = [...experiences].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <header className="flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-black text-[#1D1D1F] tracking-tight">你好, {userProfile?.name || '同学'}</h2>
            <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-[10px]">Academic Achievement Journey & Insights</p>
          </div>
          <div className="hidden md:flex items-center gap-4 text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-5 py-2.5 rounded-2xl border border-blue-100">
             <Trophy size={14} /> Total Honors: {experiences.length}
          </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 能力雷达 */}
        <div className="lg:col-span-1 bg-white rounded-[48px] shadow-sm border border-gray-100 p-10 flex flex-col items-center group transition-all hover:shadow-xl hover:shadow-gray-100/50">
            <h3 className="font-black text-xl text-slate-800 mb-10 self-start flex items-center gap-4">
                <div className="w-2 h-7 bg-blue-600 rounded-full shadow-lg shadow-blue-100"></div> 
                能力全维画像
            </h3>
            <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={skills}>
                    <PolarGrid stroke="#f1f5f9" strokeWidth={2} />
                    <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: '900' }} />
                    <Radar dataKey="score" stroke="#0066FF" strokeWidth={4} fill="#0066FF" fillOpacity={0.06} />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                </RadarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-3 w-full">
                {skills.slice(0, 4).map(s => (
                    <div key={s.name} className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.name}</p>
                        <p className="text-xl font-black text-slate-800 mt-1">{s.score}%</p>
                    </div>
                ))}
            </div>
        </div>

        {/* 成长路径图 */}
        <div className="lg:col-span-2 bg-white rounded-[48px] shadow-sm border border-gray-100 p-10 relative overflow-hidden flex flex-col">
            <h3 className="font-black text-xl text-slate-800 mb-14 flex items-center gap-4">
                <div className="w-2 h-7 bg-orange-500 rounded-full shadow-lg shadow-orange-100"></div> 
                荣誉成长路径图 Honor Path
            </h3>
            
            <div className="relative flex-1 min-h-[350px] overflow-x-auto no-scrollbar pt-12">
                {/* 装饰底线 */}
                <div className="absolute top-[215px] left-0 w-[500%] h-[3px] bg-slate-100 dashed-line opacity-60"></div>
                
                <div className="flex gap-28 px-10 relative">
                    {sortedExperiences.map((exp) => (
                        <div key={exp.id} className="relative flex flex-col items-center shrink-0 group">
                            {/* 橙色渐变旗帜节点 */}
                            <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700 text-white flex items-center justify-center shadow-2xl shadow-orange-200 group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-500 cursor-pointer border-4 border-white">
                                <Flag size={36} fill="white" className="drop-shadow-md" />
                            </div>
                            <div className="mt-8 w-40 text-center animate-fade-in">
                                <p className="text-[10px] font-black text-gray-300 uppercase mb-2 tracking-widest">{exp.date}</p>
                                <p className="text-sm font-black text-slate-800 line-clamp-2 leading-tight px-2">{exp.title}</p>
                            </div>
                            {/* 时间连接点 */}
                            <div className="absolute top-[202px] w-6 h-6 bg-white border-[6px] border-orange-500 rounded-full z-10 shadow-sm transition-transform group-hover:scale-125"></div>
                        </div>
                    ))}
                    
                    {/* 锁定探索节点 */}
                    <div className="relative flex flex-col items-center shrink-0 opacity-15">
                        <div className="w-24 h-24 rounded-[32px] bg-slate-50 border-4 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                            <Lock size={36} />
                        </div>
                        <div className="mt-8 w-40 text-center">
                            <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest">未来成就探索中...</p>
                        </div>
                        <div className="absolute top-[202px] w-6 h-6 bg-slate-50 border-[6px] border-slate-100 rounded-full z-10"></div>
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-8 flex items-center justify-end gap-10 opacity-40">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase"><div className="w-3 h-3 rounded-full bg-orange-500"></div> 荣誉/竞赛</div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase"><div className="w-3 h-3 rounded-full bg-blue-600"></div> 实战/科研</div>
            </div>
        </div>
      </div>

      {/* AI 报告生成 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[48px] p-12 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between group">
            <Sparkles className="absolute -right-10 -bottom-10 w-64 h-64 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
            <div className="relative z-10">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mb-8 border border-white/20">
                    <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="font-black text-3xl mb-2">DeepSeek 轨迹分析</h3>
                <p className="text-sm font-medium text-blue-100 opacity-80 leading-relaxed mb-10">利用大模型分析您的成长历史，预测未来的职业竞争力并提供改进方案。</p>
            </div>
            <button 
                onClick={handleGenerateSummary}
                disabled={loadingSummary}
                className="relative z-10 w-full bg-white text-blue-700 font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl hover:bg-blue-50 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 shadow-xl"
            >
                {loadingSummary ? <Loader2 className="animate-spin w-5 h-5" /> : <Trophy size={16} />}
                {summary ? "更新深度规划报告" : "立即生成 AI 报告"}
            </button>
        </div>

        {summary && (
            <div className="md:col-span-2 bg-white rounded-[48px] border border-blue-100 p-12 shadow-sm animate-fade-in flex flex-col justify-between relative">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <Trophy size={180} />
                </div>
                <div className="space-y-8">
                    <div>
                        <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                           <ArrowRight size={14} /> 成长路径评估 Trajectory
                        </h4>
                        <p className="text-lg font-bold text-slate-800 leading-relaxed">{summary.trajectory}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-[11px] font-black text-green-500 uppercase tracking-[0.2em] mb-3">核心亮点 Strengths</h4>
                            <p className="text-sm font-medium text-slate-600 leading-relaxed">{summary.strengths}</p>
                        </div>
                        <div>
                            <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] mb-3">改进方向 Improvements</h4>
                            <p className="text-sm font-medium text-slate-600 leading-relaxed">{summary.improvements}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      <style>{`
        .dashed-line {
            background-image: linear-gradient(to right, #e2e8f0 50%, transparent 50%);
            background-size: 15px 100%;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};
