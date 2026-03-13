import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { AlertCircle, Eye, EyeOff, GraduationCap, Loader2, PlayCircle } from 'lucide-react';
import { GrowthDashboard } from './components/GrowthDashboard';
import { JobBoard } from './components/JobBoard';
import { Layout } from './components/Layout';
import { OnboardingForm } from './components/OnboardingForm';
import { ResumePreview } from './components/ResumePreview';
import { UploadModule } from './components/UploadModule';
import { DEMO_PROFILE, INITIAL_EXPERIENCES, INITIAL_SKILLS } from './constants';
import { supabase } from './lib/supabase';
import { getProfile } from './services/profileService';
import { Experience, Skill, UserProfile } from './types';

const PHONE_PATTERN = /^1\d{10}$/;

const buildVirtualEmail = (phone: string) => `${phone}@qing.site`;

const derivePhoneFromEmail = (email?: string | null) => {
  if (!email || !email.endsWith('@qing.site')) {
    return '';
  }

  return email.replace(/@qing\.site$/i, '');
};

const normalizePhone = (value: string) => value.replace(/\D/g, '').slice(0, 11);

const hasRequiredProfileBasics = (profile: UserProfile | null) =>
  Boolean(
    profile?.name?.trim() &&
      profile?.gender?.trim() &&
      profile?.university?.trim() &&
      profile?.major?.trim() &&
      profile?.grade?.trim() &&
      profile?.email?.trim(),
  );

const sortExperiencesByDate = (items: Experience[]) =>
  [...items].sort((a, b) => b.date.localeCompare(a.date));

const createFallbackProfile = (user: User | null, phone: string): UserProfile => ({
  ...DEMO_PROFILE,
  id: user?.id,
  name: '',
  email: '',
  phone,
  location: '',
  linkedin: '',
  university: '',
  major: '',
  degree: '本科',
  gpa: '',
  courses: '',
  period: '',
  gender: '',
  grade: '',
  personalAdvantages: '',
  techPlanning: '',
});

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [skills] = useState<Skill[]>(INITIAL_SKILLS);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [bootstrapping, setBootstrapping] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      setBootstrapping(false);
      return;
    }

    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        const sessionUser = session?.user ?? null;
        setUser(sessionUser);

        const restoredPhone = derivePhoneFromEmail(sessionUser?.email);
        if (restoredPhone) {
          setPhone(restoredPhone);
        }

        const authListener = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (!mounted) {
            return;
          }

          const nextUser = nextSession?.user ?? null;
          setUser(nextUser);

          const nextPhone = derivePhoneFromEmail(nextUser?.email);
          if (nextPhone) {
            setPhone(nextPhone);
          }
        });

        subscription = authListener.data.subscription;
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        if (mounted) {
          setBootstrapping(false);
        }
      }
    };

    void initAuth();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      setLoadingData(false);
      setExperiences(sortExperiencesByDate(INITIAL_EXPERIENCES));
      setUserProfile(DEMO_PROFILE);
      setShowOnboarding(false);
      return;
    }

    if (!user) {
      setLoadingData(false);
      setExperiences([]);
      setUserProfile(null);
      setShowOnboarding(false);
      return;
    }

    let mounted = true;

    const fetchInitialData = async () => {
      setLoadingData(true);

      try {
        const [profile, experiencesResult] = await Promise.all([
          getProfile(user.id),
          supabase
            .from('experiences')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false }),
        ]);

        if (!mounted) {
          return;
        }

        if (experiencesResult.error) {
          throw experiencesResult.error;
        }

        setExperiences(sortExperiencesByDate((experiencesResult.data as Experience[]) || []));
        setUserProfile(profile);
        setShowOnboarding(!hasRequiredProfileBasics(profile));
      } catch (error) {
        console.error('Initial data load failed:', error);
      } finally {
        if (mounted) {
          setLoadingData(false);
        }
      }
    };

    void fetchInitialData();

    return () => {
      mounted = false;
    };
  }, [isDemoMode, user]);

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedPhone = normalizePhone(phone);
    if (!PHONE_PATTERN.test(normalizedPhone)) {
      setAuthError('请输入正确的 11 位手机号。');
      return;
    }

    if (password.trim().length < 6) {
      setAuthError('密码至少需要 6 位字符。');
      return;
    }

    setAuthError(null);
    setAuthLoading(true);

    const virtualEmail = buildVirtualEmail(normalizedPhone);
    setPhone(normalizedPhone);

    try {
      if (isRegistering) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: virtualEmail,
          password,
          options: {
            data: {
              phone: normalizedPhone,
            },
          },
        });

        if (signUpError) {
          throw signUpError;
        }
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password,
      });

      if (signInError) {
        throw signInError;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败，请稍后重试。';
      setAuthError(
        /email not confirmed/i.test(message)
          ? '当前 Supabase 开启了邮箱确认，但本站使用手机号映射邮箱登录。请在 Supabase Auth 中关闭邮箱确认后再试。'
          : message,
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setActiveTab('dashboard');

    if (isDemoMode) {
      setIsDemoMode(false);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
    }
  };

  const resolvedPhone = phone || derivePhoneFromEmail(user?.email);
  const profileForView = isDemoMode
    ? DEMO_PROFILE
    : userProfile || createFallbackProfile(user, resolvedPhone);

  if (bootstrapping || loadingData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F7]">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-blue-500" />
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
          Initializing 青网站
        </span>
      </div>
    );
  }

  if (!user && !isDemoMode) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5F5F7] px-4 py-8 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.42),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(199,210,254,0.36),transparent_32%)]" />
        <div className="absolute left-[-6%] top-[-6%] h-[36%] w-[36%] rounded-full bg-blue-100/60 blur-[58px]" />
        <div className="absolute bottom-[-6%] right-[-6%] h-[36%] w-[36%] rounded-full bg-indigo-100/60 blur-[58px]" />

        <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[40px] border border-slate-200 bg-white p-6 shadow-[0_44px_110px_-28px_rgba(15,23,42,0.16)] sm:p-8 md:p-10">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-blue-600 shadow-2xl shadow-blue-300">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
            <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              青网站
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              Student Growth Assistant
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <label className="ml-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                手机号
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={11}
                required
                placeholder="请输入 11 位手机号"
                className="w-full rounded-[22px] border-2 border-slate-100 bg-white px-5 py-4 text-base font-bold text-slate-900 outline-none transition-all placeholder:font-medium placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5"
                value={phone}
                onChange={(event) => setPhone(normalizePhone(event.target.value))}
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="请输入密码"
                  className="w-full rounded-[22px] border-2 border-slate-100 bg-white px-5 py-4 pr-14 text-base font-bold text-slate-900 outline-none transition-all placeholder:font-medium placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-300 transition-colors hover:text-blue-500"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="rounded-[22px] border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-medium leading-relaxed text-blue-700">
              站点当前使用“手机号映射虚拟邮箱”的 Supabase 登录方式，手机号不会直接写入公开页面。
            </div>

            {authError && (
              <div className="flex items-start gap-3 rounded-[22px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              disabled={authLoading}
              className="mt-2 flex w-full items-center justify-center gap-3 rounded-[24px] bg-blue-600 py-4 text-xs font-black uppercase tracking-[0.25em] text-white shadow-2xl shadow-blue-200 transition-all hover:bg-blue-700 disabled:opacity-50"
            >
              {authLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isRegistering ? (
                '立即注册'
              ) : (
                '登录'
              )}
            </button>
          </form>

          <div className="mt-8 flex flex-col gap-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering((current) => !current);
                setAuthError(null);
              }}
              className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 transition-colors hover:text-blue-600"
            >
              {isRegistering ? '已有账号？返回登录' : '还没有账号？立即注册'}
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                or
              </span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsDemoMode(true);
                setAuthError(null);
              }}
              className="flex w-full items-center justify-center gap-3 rounded-[24px] border border-slate-100 bg-slate-50 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900"
            >
              <PlayCircle className="h-5 w-5" />
              游客体验模式
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      userEmail={user?.email}
      isDemoMode={isDemoMode}
      onLogout={handleLogout}
    >
      {activeTab === 'dashboard' && (
        <GrowthDashboard experiences={experiences} skills={skills} userProfile={profileForView} />
      )}

      {activeTab === 'upload' && (
        <UploadModule
          onAddExperience={(experience) => {
            setExperiences((current) =>
              sortExperiencesByDate([experience, ...current.filter((item) => item.id !== experience.id)]),
            );
            setActiveTab('dashboard');
          }}
        />
      )}

      {activeTab === 'resume' && (
        <ResumePreview
          experiences={experiences}
          skills={skills}
          userProfile={profileForView}
          userId={user?.id}
          isDemoMode={isDemoMode}
          onProfileUpdate={setUserProfile}
          onExperiencesUpdate={(items) => setExperiences(sortExperiencesByDate(items))}
        />
      )}

      {activeTab === 'jobs' && <JobBoard experiences={experiences} skills={skills} />}

      {showOnboarding && !isDemoMode && user && (
        <OnboardingForm
          userId={user.id}
          userPhone={resolvedPhone}
          initialProfile={profileForView}
          onComplete={(profile) => {
            setUserProfile(profile);
            setShowOnboarding(false);
          }}
        />
      )}
    </Layout>
  );
};

export default App;
