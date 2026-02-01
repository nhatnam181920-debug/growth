
import React, { useState } from 'react';
import { User, School, BookOpen, Calendar, UserCheck, Loader2, Sparkles, ChevronRight, GraduationCap, AlertCircle, CheckCircle2, Monitor, Database } from 'lucide-react';
import { UserProfile } from '../types';
import { updateProfile } from '../services/profileService';

interface OnboardingFormProps {
  userId: string;
  userPhone: string;
  onComplete: (profile: UserProfile) => void;
}

export const OnboardingForm: React.FC<OnboardingFormProps> = ({ userId, userPhone, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showBypass, setShowBypass] = useState(false);
  
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    university: '',
    major: '',
    grade: '大一',
    gender: '男',
    email: `${userPhone}@unipath.io`,
    phone: userPhone,
    location: '待完善',
    linkedin: '',
    degree: '本科',
    gpa: '4.0',
    courses: '',
    period: `${new Date().getFullYear()} - ${new Date().getFullYear() + 4}`
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim() || !formData.university?.trim() || !formData.major?.trim()) {
      setErrorMessage('请填写姓名、学校和专业后再开启规划');
      setStatus('error');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setErrorMessage('');
    setShowBypass(false);

    try {
      const fullProfile = { ...formData, id: userId } as UserProfile & { id: string };
      await updateProfile(fullProfile);
      
      setStatus('success');
      setTimeout(() => {
        onComplete(fullProfile);
      }, 800);
      
    } catch (error: any) {
      console.error('Onboarding Save Error:', error);
      
      const isTableMissing = error.message?.includes('profiles') || error.message?.includes('not found') || error.message?.includes('404');
      
      setErrorMessage(error.message);
      setStatus('error');
      if (isTableMissing) setShowBypass(true);
      
    } finally {
      setLoading(false);
    }
  };

  const handleBypass = () => {
    onComplete({ ...formData, id: userId } as UserProfile);
  };

  const grades = ['大一', '大二', '大三', '大四', '研一', '研二', '研三', '博士'];
  const inputBaseClass = "w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 font-black placeholder:text-slate-300 placeholder:font-normal focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all duration-200 shadow-sm";
  const labelBaseClass = "text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1 mb-2 flex items-center gap-2";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scale-in border border-white/20">
        <div className="md:w-1/3 bg-indigo-600 p-10 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md shadow-inner">
                    <GraduationCap className="w-7 h-7" />
                </div>
                <h2 className="text-3xl font-black leading-tight mb-4">欢迎来到 UniPath AI</h2>
                <p className="text-indigo-100 text-sm opacity-80 leading-relaxed font-medium">
                    在开启智能成长之旅前，请完善您的基础档案。这将帮助 AI 为您提供更精准的职业匹配建议。
                </p>
            </div>
            <div className="relative z-10 mt-12 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-indigo-200">
                    <div className="w-2 h-2 bg-indigo-300 rounded-full animate-pulse"></div>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI 深度画像建模中</span>
                </div>
            </div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        <div className="md:w-2/3 p-10 lg:p-14 bg-white overflow-y-auto max-h-[90vh]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className={labelBaseClass}><User className="w-3.5 h-3.5" /> 真实姓名</label>
                <input required placeholder="请输入您的姓名" className={inputBaseClass} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="flex flex-col">
                <label className={labelBaseClass}><UserCheck className="w-3.5 h-3.5" /> 性别选择</label>
                <div className="flex gap-3">
                  {['男', '女'].map(g => (
                    <button key={g} type="button" onClick={() => setFormData({ ...formData, gender: g as any })}
                      className={`flex-1 py-4 rounded-2xl font-black transition-all border-2 ${formData.gender === g ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-200 hover:bg-slate-100'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <label className={labelBaseClass}><School className="w-3.5 h-3.5" /> 就读高校</label>
              <input required placeholder="例如：浙江科技大学" className={inputBaseClass} value={formData.university} onChange={e => setFormData({ ...formData, university: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className={labelBaseClass}><BookOpen className="w-3.5 h-3.5" /> 就读专业</label>
                <input required placeholder="例如：自动化" className={inputBaseClass} value={formData.major} onChange={e => setFormData({ ...formData, major: e.target.value })} />
              </div>
              <div className="flex flex-col">
                <label className={labelBaseClass}><Calendar className="w-3.5 h-3.5" /> 当前年级</label>
                <div className="relative">
                    <select className={`${inputBaseClass} appearance-none cursor-pointer pr-10`} value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })}>
                      {grades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronRight className="w-5 h-5 rotate-90" /></div>
                </div>
              </div>
            </div>

            {status === 'error' && (
                <div className="p-5 bg-red-50 border-2 border-red-100 rounded-[1.5rem] animate-shake">
                    <div className="flex items-start gap-3 text-red-700">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="space-y-3">
                            <p className="text-sm font-bold leading-relaxed">{errorMessage}</p>
                            {showBypass && (
                                <div className="flex flex-col gap-2">
                                  <a 
                                    href="https://supabase.com/dashboard/project/qukufjigazwwrhtgiesu/sql" 
                                    target="_blank"
                                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl text-xs font-black shadow-lg hover:bg-indigo-700 transition-all uppercase tracking-widest"
                                  >
                                      <Database className="w-4 h-4" /> 前往 SQL Editor 补全表
                                  </a>
                                  <button 
                                      type="button"
                                      onClick={handleBypass}
                                      className="flex items-center justify-center gap-2 bg-white text-slate-600 px-4 py-3 rounded-xl text-xs font-black shadow-sm border border-slate-200 hover:bg-slate-50 transition-all uppercase tracking-widest"
                                  >
                                      <Monitor className="w-4 h-4" /> 暂时跳过(本地模式)
                                  </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <button 
              type="submit"
              disabled={loading || status === 'success'}
              className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-[0.98] mt-4 group shadow-2xl ${
                status === 'success' ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
              }`}
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : status === 'success' ? <><CheckCircle2 className="w-6 h-6 animate-bounce" /> 开启成功...</> : <>开启我的职业规划 <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
