import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  School,
  Sparkles,
  User,
  UserCheck,
} from 'lucide-react';
import { UserProfile } from '../types';
import { updateProfile } from '../services/profileService';

interface OnboardingFormProps {
  userId: string;
  userPhone: string;
  initialProfile?: UserProfile | null;
  onComplete: (profile: UserProfile) => void;
}

type Status = 'idle' | 'success' | 'error';

const currentYear = new Date().getFullYear();

const grades = ['大一', '大二', '大三', '大四', '研一', '研二', '研三', '博士'];

const buildInitialFormData = (
  userPhone: string,
  initialProfile?: UserProfile | null,
): Partial<UserProfile> => ({
  name: initialProfile?.name || '',
  university: initialProfile?.university || '',
  major: initialProfile?.major || '',
  grade: initialProfile?.grade || '',
  gender: initialProfile?.gender || '',
  email: initialProfile?.email || '',
  phone: initialProfile?.phone || userPhone,
  location: initialProfile?.location || '',
  linkedin: initialProfile?.linkedin || '',
  degree: initialProfile?.degree || '本科',
  gpa: initialProfile?.gpa || '',
  courses: initialProfile?.courses || '',
  period: initialProfile?.period || `${currentYear} - ${currentYear + 4}`,
});

export const OnboardingForm: React.FC<OnboardingFormProps> = ({
  userId,
  userPhone,
  initialProfile,
  onComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState<Partial<UserProfile>>(
    buildInitialFormData(userPhone, initialProfile),
  );

  const inputBaseClass =
    'w-full rounded-[22px] border-2 border-slate-100 bg-slate-50 px-4 py-4 font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-indigo-500 focus:bg-white';
  const labelBaseClass =
    'mb-2 ml-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500';

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, []);

  const updateField = (key: keyof UserProfile, value: string) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !formData.name?.trim() ||
      !formData.gender?.trim() ||
      !formData.university?.trim() ||
      !formData.major?.trim() ||
      !formData.grade?.trim() ||
      !formData.email?.trim()
    ) {
      setStatus('error');
      setErrorMessage('请先补全姓名、性别、院校、专业、年级和邮箱后再继续使用。');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const fullProfile = {
        ...formData,
        id: userId,
        phone: formData.phone?.trim() || userPhone,
      } as UserProfile & { id: string };

      await updateProfile(fullProfile);

      setStatus('success');
      window.setTimeout(() => {
        onComplete(fullProfile);
      }, 500);
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败，请稍后重试。';
      setStatus('error');
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] isolate">
      <div className="absolute inset-0 bg-slate-950/82" />
      <div className="relative z-10 overflow-y-auto p-4">
        <div className="flex min-h-[calc(100vh-2rem)] items-start justify-center py-4 md:items-center">
          <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-[40px] border border-slate-200 bg-[#FCFCFD] shadow-[0_48px_140px_-50px_rgba(15,23,42,0.62)] md:flex-row">
            <div className="relative overflow-hidden bg-indigo-600 p-8 text-white md:w-[36%] lg:p-10">
              <div className="relative z-10">
                <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/18">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <h2 className="text-3xl font-black leading-tight">欢迎来到青网站</h2>
                <p className="mt-4 text-sm font-medium leading-relaxed text-indigo-100/90">
                  首次使用前，请先补全基础档案。系统会根据这些信息生成更准确的成长建议、实习匹配和个性化实习履历。
                </p>
              </div>

              <div className="relative z-10 mt-10 space-y-4 border-t border-white/15 pt-6">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-200">
                  <Sparkles className="h-4 w-4" />
                  New user setup
                </div>
                <div className="space-y-3 text-sm font-medium leading-relaxed text-indigo-100/90">
                  <div>1. 补齐姓名、院校、专业、年级等基础信息</div>
                  <div>2. 完成后再进入成果管理、简历和精准实习匹配</div>
                  <div>3. 这些信息后续仍可在简历页继续完善</div>
                </div>
              </div>

              <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            </div>

            <div className="max-h-[90vh] flex-1 overflow-y-auto bg-white p-6 sm:p-8 lg:p-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className={labelBaseClass}>
                      <User className="h-4 w-4" />
                      姓名
                    </label>
                    <input
                      required
                      placeholder="例如：张同学"
                      className={inputBaseClass}
                      value={formData.name || ''}
                      onChange={(event) => updateField('name', event.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelBaseClass}>
                      <UserCheck className="h-4 w-4" />
                      性别
                    </label>
                    <div className="flex gap-3">
                      {(['男', '女', '其他'] as const).map((gender) => (
                        <button
                          key={gender}
                          type="button"
                          onClick={() => updateField('gender', gender)}
                          className={`flex-1 rounded-[20px] border-2 px-4 py-4 text-sm font-black transition-all ${
                            formData.gender === gender
                              ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                              : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-indigo-200'
                          }`}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className={labelBaseClass}>
                      <School className="h-4 w-4" />
                      院校
                    </label>
                    <input
                      required
                      placeholder="例如：复旦大学"
                      className={inputBaseClass}
                      value={formData.university || ''}
                      onChange={(event) => updateField('university', event.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelBaseClass}>
                      <BookOpen className="h-4 w-4" />
                      专业
                    </label>
                    <input
                      required
                      placeholder="例如：软件工程"
                      className={inputBaseClass}
                      value={formData.major || ''}
                      onChange={(event) => updateField('major', event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className={labelBaseClass}>
                      <Calendar className="h-4 w-4" />
                      当前年级
                    </label>
                    <div className="relative">
                      <select
                        required
                        className={`${inputBaseClass} appearance-none pr-10`}
                        value={formData.grade || ''}
                        onChange={(event) => updateField('grade', event.target.value)}
                      >
                        <option value="">请选择当前年级</option>
                        {grades.map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                      <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 rotate-90 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className={labelBaseClass}>
                      <Mail className="h-4 w-4" />
                      常用邮箱
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="例如：name@example.com"
                      className={inputBaseClass}
                      value={formData.email || ''}
                      onChange={(event) => updateField('email', event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className={labelBaseClass}>
                      <Phone className="h-4 w-4" />
                      手机号
                    </label>
                    <input
                      readOnly={Boolean(userPhone)}
                      placeholder="手机号"
                      className={`${inputBaseClass} ${userPhone ? 'cursor-not-allowed text-slate-500' : ''}`}
                      value={formData.phone || ''}
                      onChange={(event) => updateField('phone', event.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelBaseClass}>
                      <MapPin className="h-4 w-4" />
                      所在城市
                    </label>
                    <input
                      placeholder="例如：上海"
                      className={inputBaseClass}
                      value={formData.location || ''}
                      onChange={(event) => updateField('location', event.target.value)}
                    />
                  </div>
                </div>

                {status === 'error' && (
                  <div className="rounded-[24px] border border-red-100 bg-red-50 p-5">
                    <div className="flex items-start gap-3 text-red-700">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                      <p className="text-sm font-bold leading-relaxed">{errorMessage}</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || status === 'success'}
                  className={`flex w-full items-center justify-center gap-3 rounded-[24px] px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-2xl transition-all ${
                    status === 'success' ? 'bg-green-500' : 'bg-slate-900 hover:bg-slate-800'
                  } disabled:opacity-60`}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : status === 'success' ? (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      已完成，正在进入系统
                    </>
                  ) : (
                    <>
                      完成基础信息并进入网站
                      <ChevronRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
