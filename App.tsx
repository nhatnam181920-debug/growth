
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { GrowthDashboard } from './components/GrowthDashboard';
import { UploadModule } from './components/UploadModule';
import { ResumePreview } from './components/ResumePreview';
import { JobBoard } from './components/JobBoard';
import { OnboardingForm } from './components/OnboardingForm';
import { Experience, Skill, UserProfile } from './types';
import { INITIAL_SKILLS, INITIAL_EXPERIENCES } from './constants';
import { supabase } from './lib/supabase';
import { getProfile } from './services/profileService';
import { Loader2, GraduationCap, PlayCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>(INITIAL_SKILLS);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<any>(null);

  useEffect(() => {
    let subscription: any = null;
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isDemoMode) setUser(session?.user ?? null);
        const authRes = supabase.auth.onAuthStateChange((_event, session) => {
          if (!isDemoMode) setUser(session?.user ?? null);
        });
        subscription = authRes.data.subscription;
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
    return () => { if (subscription) subscription.unsubscribe(); };
  }, [isDemoMode]);

  useEffect(() => {
    if (user || isDemoMode) fetchInitialData();
  }, [user, isDemoMode]);

  const fetchInitialData = async () => {
    if (isDemoMode) {
      setExperiences(INITIAL_EXPERIENCES);
      setUserProfile({
        name: '演示同学', university: '某重点高校', major: '计算机科学', gender: '男', grade: '大三',
        email: 'demo@unipath.io', phone: '13800000000', location: '上海', linkedin: '', degree: '本科',
        gpa: '3.9/4.0', courses: '算法', period: '2022-2026', personalAdvantages: "擅长全栈开发，具备敏锐的产品洞察力。", techPlanning: "规划：深耕人工智能领域，目标成为资深工程师。"
      });
      return;
    }
    setLoading(true);
    try {
      const profile = await getProfile(user.id);
      if (!profile) setShowOnboarding(true);
      else setUserProfile(profile);
      const { data } = await supabase.from('experiences').select('*').order('date', { ascending: false });
      if (data) setExperiences(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    const virtualEmail = `${phone}@unipath.io`;
    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({ email: virtualEmail, password });
        if (error) throw error;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: virtualEmail, password });
      if (error) throw error;
    } catch (err: any) { 
      setAuthError({ message: err.message || "登录失败，请检查账户或网络" }); 
    } finally { 
      setAuthLoading(false); 
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#F5F5F7]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
      <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Initializing UniPath</span>
    </div>
  );

  if (!user && !isDemoMode) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F5F5F7] p-6 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-100/40 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-100/40 rounded-full blur-[120px] animate-pulse"></div>
        
        <div className="bg-white/80 backdrop-blur-3xl rounded-[48px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.12)] w-full max-w-md overflow-hidden border border-white/50 relative z-10 p-12">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-300 transform transition-transform hover:scale-105 active:scale-95 cursor-pointer">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-2 italic">UniPath AI</h1>
            <p className="text-gray-400 text-[10px] font-black tracking-[0.3em] uppercase">Student Evolution Platform</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">手机号 Mobile</label>
              <input 
                type="tel" 
                required 
                placeholder="请输入您的手机号" 
                className="w-full px-7 py-5 rounded-[22px] border-2 border-gray-100 bg-white text-gray-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-gray-300 placeholder:font-medium shadow-sm" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2 relative">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">密码 Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  placeholder="请输入您的密码" 
                  className="w-full px-7 py-5 rounded-[22px] border-2 border-gray-100 bg-white text-gray-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all pr-16 placeholder:text-gray-300 placeholder:font-medium shadow-sm" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-blue-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-3 p-4 bg-red-50 text-red-500 text-[11px] font-bold rounded-2xl border border-red-100 animate-shake">
                <AlertCircle size={16} /> {authError.message}
              </div>
            )}

            <button 
              disabled={authLoading} 
              className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 active:scale-[0.98] disabled:opacity-50 mt-4"
            >
              {authLoading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : isRegistering ? '立即注册 Sign Up' : '登 录 Log In'}
            </button>
          </form>

          <div className="mt-10 flex flex-col gap-4 text-center">
            <button 
              onClick={() => setIsRegistering(!isRegistering)} 
              className="text-gray-400 text-[11px] font-black uppercase tracking-widest hover:text-blue-600 transition-colors"
            >
              {isRegistering ? '已有账号？点击返回登录' : '还没有账号？点击此处注册'}
            </button>
            <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-100"></div>
                <span className="flex-shrink mx-4 text-gray-200 text-[10px] font-black uppercase tracking-widest">or</span>
                <div className="flex-grow border-t border-gray-100"></div>
            </div>
            <button 
              onClick={() => setIsDemoMode(true)} 
              className="w-full py-5 bg-gray-50 text-gray-500 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-100"
            >
                <PlayCircle className="w-5 h-5" /> 游客体验模式 Demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} userEmail={user?.email}>
      {activeTab === 'dashboard' && <GrowthDashboard experiences={experiences} skills={skills} userProfile={userProfile} />}
      {activeTab === 'upload' && <UploadModule onAddExperience={(e) => { setExperiences([...experiences, e]); setActiveTab('dashboard'); }} />}
      {activeTab === 'resume' && <ResumePreview experiences={experiences} skills={skills} userProfile={userProfile || {} as any} onProfileUpdate={setUserProfile} />}
      {activeTab === 'jobs' && <JobBoard experiences={experiences} skills={skills} />}
      {showOnboarding && !isDemoMode && <OnboardingForm userId={user.id} userPhone={phone} onComplete={(p) => { setUserProfile(p); setShowOnboarding(false); }} />}
    </Layout>
  );
};

export default App;
