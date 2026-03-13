import React, { useEffect, useState } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  ArrowRight,
  CheckCircle2,
  Flag,
  Loader2,
  Lock,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { Experience, ExperienceCategory, Skill, UserProfile } from '../types';
import { generateGrowthSummary } from '../services/aiService';

type Summary = {
  trajectory: string;
  strengths: string;
  improvements: string;
};

interface GrowthDashboardProps {
  experiences: Experience[];
  skills: Skill[];
  userProfile?: UserProfile | null;
}

const MAX_SHOWCASE_ITEMS = 6;

const categoryLabelMap: Record<ExperienceCategory, string> = {
  Academic: '学术成果',
  Competition: '竞赛荣誉',
  Internship: '实习实践',
  Project: '项目成果',
  Campus: '校园经历',
};

const categoryClassMap: Record<ExperienceCategory, string> = {
  Academic: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  Competition: 'border-orange-100 bg-orange-50 text-orange-700',
  Internship: 'border-blue-100 bg-blue-50 text-blue-700',
  Project: 'border-violet-100 bg-violet-50 text-violet-700',
  Campus: 'border-slate-200 bg-slate-100 text-slate-600',
};

const buildShowcaseStorageKey = (userProfile?: UserProfile | null) =>
  `qing_growth_showcase_${userProfile?.id || userProfile?.email || userProfile?.name || 'guest'}`;

export const GrowthDashboard: React.FC<GrowthDashboardProps> = ({
  experiences,
  skills,
  userProfile,
}) => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [timelinePanelOpen, setTimelinePanelOpen] = useState(false);
  const [showcaseIds, setShowcaseIds] = useState<string[]>([]);
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);

  const showcaseStorageKey = buildShowcaseStorageKey(userProfile);
  const newestFirstExperiences = [...experiences].sort((a, b) => b.date.localeCompare(a.date));
  const sortedExperiences = [...experiences].sort((a, b) => a.date.localeCompare(b.date));
  const latestExperience = newestFirstExperiences[0];
  const defaultShowcaseIds = newestFirstExperiences
    .slice(0, MAX_SHOWCASE_ITEMS)
    .map((experience) => experience.id);
  const showcaseExperiences = (
    showcaseIds.length > 0
      ? experiences.filter((experience) => showcaseIds.includes(experience.id))
      : newestFirstExperiences.slice(0, MAX_SHOWCASE_ITEMS)
  ).sort((a, b) => a.date.localeCompare(b.date));
  const hiddenExperienceCount = Math.max(experiences.length - showcaseExperiences.length, 0);

  useEffect(() => {
    const validIds = new Set(experiences.map((experience) => experience.id));
    const latestIds = [...experiences]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, MAX_SHOWCASE_ITEMS)
      .map((experience) => experience.id);
    let nextIds = latestIds;

    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(showcaseStorageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as unknown;
          if (Array.isArray(parsed)) {
            const filtered = parsed
              .filter((item): item is string => typeof item === 'string' && validIds.has(item))
              .slice(0, MAX_SHOWCASE_ITEMS);
            if (filtered.length > 0) {
              nextIds = filtered;
            }
          }
        } catch (error) {
          console.warn('Failed to read showcase achievements:', error);
        }
      }
    }

    setShowcaseIds((current) => {
      const isSame =
        current.length === nextIds.length && current.every((item, index) => item === nextIds[index]);
      return isSame ? current : nextIds;
    });
  }, [showcaseStorageKey, experiences]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (showcaseIds.length === 0) {
      window.localStorage.removeItem(showcaseStorageKey);
      return;
    }

    window.localStorage.setItem(showcaseStorageKey, JSON.stringify(showcaseIds));
  }, [showcaseIds, showcaseStorageKey]);

  useEffect(() => {
    if (typeof document === 'undefined' || !timelinePanelOpen) {
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
  }, [timelinePanelOpen]);

  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    try {
      const result = await generateGrowthSummary(experiences);
      setSummary(result);
    } catch (error) {
      console.error('Growth summary failed:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  const toggleShowcaseExperience = (id: string) => {
    let nextMessage: string | null = null;

    setShowcaseIds((current) => {
      if (current.includes(id)) {
        if (current.length === 1) {
          nextMessage = '至少保留 1 条展示荣誉，成长路径才不会留空。';
          return current;
        }

        nextMessage = '已从上方成长路径移除该荣誉。';
        return current.filter((item) => item !== id);
      }

      if (current.length >= MAX_SHOWCASE_ITEMS) {
        nextMessage = `最多展示 ${MAX_SHOWCASE_ITEMS} 条荣誉，请先取消一项再添加。`;
        return current;
      }

      nextMessage = '已加入上方成长路径展示。';
      return [...current, id];
    });

    setSelectionNotice(nextMessage);
  };

  const restoreLatestShowcase = () => {
    setShowcaseIds(defaultShowcaseIds);
    setSelectionNotice(`已恢复为最近 ${Math.min(defaultShowcaseIds.length, MAX_SHOWCASE_ITEMS)} 条荣誉展示。`);
  };

  return (
    <div className="animate-fade-in space-y-8 pb-12 sm:space-y-10 lg:space-y-12">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            你好，{userProfile?.name || '同学'}
          </h2>
          <p className="mt-2 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
            Academic Journey & Growth Insights
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] border border-blue-100 bg-blue-50 px-5 py-4 text-blue-700">
            <p className="text-[10px] font-black uppercase tracking-[0.22em]">累计成果</p>
            <p className="mt-2 text-2xl font-black">{experiences.length}</p>
          </div>
          <div className="rounded-[24px] border border-orange-100 bg-orange-50 px-5 py-4 text-orange-700">
            <p className="text-[10px] font-black uppercase tracking-[0.22em]">最新节点</p>
            <p className="mt-2 text-sm font-black">{latestExperience?.date || '待录入'}</p>
          </div>
          <div className="rounded-[24px] border border-slate-100 bg-white px-5 py-4 text-slate-700">
            <p className="text-[10px] font-black uppercase tracking-[0.22em]">能力维度</p>
            <p className="mt-2 text-2xl font-black">{skills.length}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
        <section className="rounded-[40px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8 xl:col-span-1">
          <h3 className="mb-8 flex items-center gap-4 text-xl font-black text-slate-800">
            <div className="h-7 w-2 rounded-full bg-blue-600 shadow-lg shadow-blue-100" />
            能力全维画像
          </h3>

          <div className="h-[260px] w-full sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={skills}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 800 }}
                />
                <Radar
                  dataKey="score"
                  stroke="#0066FF"
                  strokeWidth={3}
                  fill="#0066FF"
                  fillOpacity={0.08}
                  isAnimationActive={false}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, '得分']}
                  contentStyle={{
                    borderRadius: '18px',
                    border: 'none',
                    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
                    fontWeight: 700,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {skills.slice(0, 4).map((skill) => (
              <div
                key={skill.name}
                className="rounded-[24px] border border-slate-100 bg-slate-50 p-4"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  {skill.name}
                </p>
                <p className="mt-2 text-xl font-black text-slate-800">{skill.score}%</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[40px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="flex items-center gap-4 text-xl font-black text-slate-800">
                <div className="h-7 w-2 rounded-full bg-orange-500 shadow-lg shadow-orange-100" />
                荣誉成长路径
              </h3>
              <p className="mt-2 max-w-2xl text-[13px] font-medium leading-6 text-slate-500 sm:text-sm">
                当前展示 {showcaseExperiences.length} / {experiences.length} 条荣誉，按蛇形路径展开。
                你可以优先展示最近成果，也可以手动挑选最想被看到的节点。
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setTimelinePanelOpen(true);
                  setSelectionNotice(null);
                }}
                disabled={experiences.length === 0}
                className="rounded-[16px] border border-orange-200 bg-orange-50 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                管理展示
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimelinePanelOpen(true);
                  setSelectionNotice(null);
                }}
                disabled={experiences.length === 0}
                className="rounded-[16px] border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                查看全部荣誉
              </button>
            </div>
          </div>

          {sortedExperiences.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50 text-center">
              <div className="max-w-sm px-6">
                <Trophy className="mx-auto mb-4 h-10 w-10 text-slate-300" />
                <p className="text-base font-black text-slate-600">还没有成长节点</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                  先去上传竞赛、项目或实践成果，成长轨迹会自动在这里生成。
                </p>
              </div>
            </div>
          ) : (
            <div className="relative rounded-[28px] border border-orange-100 bg-orange-50/30 px-3 py-5 sm:px-4 sm:py-6">
              <div className="pointer-events-none absolute bottom-10 left-[21px] top-6 w-[2px] rounded-full snake-line md:left-1/2 md:-translate-x-1/2" />

              <div className="space-y-4">
                {showcaseExperiences.map((experience, index) => {
                  const isRight = index % 2 === 1;
                  const categoryClass = categoryClassMap[experience.category];
                  const categoryLabel = categoryLabelMap[experience.category];

                  return (
                    <div
                      key={experience.id}
                      className="relative pl-12 md:grid md:grid-cols-[minmax(0,1fr)_78px_minmax(0,1fr)] md:items-start md:pl-0"
                    >
                      <div
                        className={`${
                          isRight ? 'md:col-start-3 md:pl-4' : 'md:col-start-1 md:pr-4'
                        }`}
                      >
                        <div className="rounded-[24px] border border-white bg-white p-4 shadow-[0_20px_48px_-34px_rgba(249,115,22,0.35)]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-300">
                              {experience.date || '待补时间'}
                            </p>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${categoryClass}`}
                            >
                              {categoryLabel}
                            </span>
                          </div>
                          <h4 className="mt-2.5 text-base font-black leading-snug text-slate-900 sm:text-[17px]">
                            {experience.title}
                          </h4>
                          <p className="mt-1.5 text-[13px] font-semibold leading-5 text-slate-500 sm:text-sm">
                            {[experience.organizer, experience.role].filter(Boolean).join(' · ') ||
                              '补充主办方与角色信息，会让这条荣誉更完整。'}
                          </p>
                          <p className="mt-2.5 text-[13px] leading-5 text-slate-500 sm:text-sm sm:leading-6">
                            {experience.description || '建议补充本次荣誉对应的任务、成果和影响力。'}
                          </p>
                        </div>
                      </div>

                      <div className="absolute left-0 top-0 flex w-10 flex-col items-center md:static md:col-start-2 md:mx-auto md:w-auto">
                        <div className="flex h-[56px] w-[56px] items-center justify-center rounded-[22px] border-4 border-white bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-xl shadow-orange-200">
                          <Flag className="h-6 w-6" />
                        </div>
                        <div className="mt-2 h-4 w-4 rounded-full border-[4px] border-orange-500 bg-white shadow-sm" />
                      </div>

                      <div
                        className={`pointer-events-none absolute left-5 top-[26px] h-[2px] w-6 dashed-line md:hidden`}
                      />
                      <div
                        className={`pointer-events-none absolute top-[26px] hidden h-10 w-12 border-t-2 border-dashed border-orange-200 md:block ${
                          isRight
                            ? 'left-[calc(50%-1px)] rounded-tl-[18px] border-l-2'
                            : 'right-[calc(50%-1px)] rounded-tr-[18px] border-r-2'
                        }`}
                      />
                    </div>
                  );
                })}

                <div className="relative pl-12 opacity-80 md:grid md:grid-cols-[minmax(0,1fr)_78px_minmax(0,1fr)] md:items-start md:pl-0">
                  <div
                    className={`${
                      showcaseExperiences.length % 2 === 0
                        ? 'md:col-start-1 md:pr-4'
                        : 'md:col-start-3 md:pl-4'
                    }`}
                  >
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-300">
                        {hiddenExperienceCount > 0 ? `+${hiddenExperienceCount} More` : 'Next'}
                      </p>
                      <p className="mt-2.5 text-[15px] font-black leading-snug text-slate-700 sm:text-base">
                        {hiddenExperienceCount > 0
                          ? `还有 ${hiddenExperienceCount} 项荣誉待展开`
                          : '未来成长节点'}
                      </p>
                      <p className="mt-1.5 text-[13px] font-semibold leading-5 text-slate-400 sm:text-sm sm:leading-6">
                        {hiddenExperienceCount > 0
                          ? '点击“查看全部荣誉”可以浏览全部记录，也可以把其中任意一项加入上方展示。'
                          : '继续上传成果，这里会自动补充新的成长里程碑。'}
                      </p>
                    </div>
                  </div>

                  <div className="absolute left-0 top-0 flex w-10 flex-col items-center md:static md:col-start-2 md:mx-auto md:w-auto">
                    <div className="flex h-[56px] w-[56px] items-center justify-center rounded-[22px] border-4 border-dashed border-slate-200 bg-slate-50 text-slate-300">
                      <Lock className="h-6 w-6" />
                    </div>
                    <div className="mt-2 h-4 w-4 rounded-full border-[4px] border-slate-200 bg-white shadow-sm" />
                  </div>

                  <div className="pointer-events-none absolute left-5 top-[26px] h-[2px] w-6 dashed-line md:hidden" />
                  <div
                    className={`pointer-events-none absolute top-[26px] hidden h-10 w-12 border-t-2 border-dashed border-slate-200 md:block ${
                      showcaseExperiences.length % 2 === 0
                        ? 'right-[calc(50%-1px)] rounded-tr-[18px] border-r-2'
                        : 'left-[calc(50%-1px)] rounded-tl-[18px] border-l-2'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px]">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
              蛇形精选展示
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              全部荣誉可在弹层查看
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1">
              最多展示 {MAX_SHOWCASE_ITEMS} 条
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
        <section className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-2xl xl:col-span-1">
          <Sparkles className="absolute -bottom-10 -right-10 h-40 w-40 rotate-12 opacity-10" />

          <div className="relative z-10">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/20 bg-white/10 backdrop-blur-md">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="text-2xl font-black tracking-tight">AI 成长总结</h3>
            <p className="mt-3 text-sm font-medium leading-relaxed text-blue-100/90">
              自动分析你的成长轨迹、关键优势与下一阶段提升方向。未配置 DeepSeek 时会使用本地规则回退。
            </p>

            <button
              type="button"
              onClick={() => void handleGenerateSummary()}
              disabled={loadingSummary}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-[22px] bg-white py-4 text-xs font-black uppercase tracking-[0.22em] text-blue-700 shadow-xl transition-all hover:bg-blue-50 disabled:opacity-60"
            >
              {loadingSummary ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trophy className="h-5 w-5" />}
              {summary ? '更新成长总结' : '生成成长总结'}
            </button>
          </div>
        </section>

        <section className="rounded-[40px] border border-blue-100 bg-white p-6 shadow-sm sm:p-8 xl:col-span-2">
          {summary ? (
            <div className="space-y-8">
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">
                  <ArrowRight className="h-4 w-4" />
                  成长轨迹评估
                </h4>
                <p className="text-lg font-bold leading-relaxed text-slate-800">
                  {summary.trajectory}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-[28px] border border-green-100 bg-green-50 p-5">
                  <h4 className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-green-600">
                    核心亮点
                  </h4>
                  <p className="text-sm font-semibold leading-relaxed text-slate-700">
                    {summary.strengths}
                  </p>
                </div>

                <div className="rounded-[28px] border border-amber-100 bg-amber-50 p-5">
                  <h4 className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-amber-600">
                    改进方向
                  </h4>
                  <p className="text-sm font-semibold leading-relaxed text-slate-700">
                    {summary.improvements}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[260px] items-center justify-center rounded-[32px] border border-dashed border-blue-100 bg-blue-50/40 text-center">
              <div className="max-w-md px-6">
                <Sparkles className="mx-auto mb-4 h-10 w-10 text-blue-300" />
                <p className="text-base font-black text-slate-700">AI 总结尚未生成</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                  点击左侧按钮后，系统会基于当前成果记录自动输出成长评估和行动建议。
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {timelinePanelOpen && (
        <div
          className="fixed inset-0 z-[80] isolate bg-slate-950/78"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setTimelinePanelOpen(false);
            }
          }}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[36px] border border-slate-200 bg-[#FCFCFD] shadow-[0_44px_140px_-48px_rgba(15,23,42,0.58)] overscroll-contain"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-500">
                    Honor Showcase
                  </div>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">全部荣誉与展示设置</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    这里会列出你的全部荣誉。你可以勾选最多 {MAX_SHOWCASE_ITEMS} 条，作为上方蛇形成长路径的精选展示。
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={restoreLatestShowcase}
                    className="rounded-[18px] border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-orange-700 transition-colors hover:bg-orange-100"
                  >
                    恢复最近展示
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelinePanelOpen(false)}
                    className="rounded-[18px] border border-slate-200 bg-white p-3 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
                    aria-label="关闭荣誉弹层"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-orange-700">
                      展示中 {showcaseExperiences.length} / {Math.min(experiences.length, MAX_SHOWCASE_ITEMS)}
                    </span>
                    <span>全部荣誉 {experiences.length} 条</span>
                  </div>

                  {selectionNotice && (
                    <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      {selectionNotice}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-[#FCFCFD] px-5 py-5 sm:px-7">
                <div className="grid gap-4 lg:grid-cols-2">
                  {newestFirstExperiences.map((experience) => {
                    const selected = showcaseIds.includes(experience.id);
                    const categoryLabel = categoryLabelMap[experience.category];
                    const categoryClass = categoryClassMap[experience.category];

                    return (
                      <article
                        key={experience.id}
                        className={`rounded-[28px] border p-5 transition-colors ${
                          selected
                            ? 'border-orange-200 bg-orange-50/60 shadow-[0_24px_60px_-32px_rgba(249,115,22,0.35)]'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                              {experience.date || '待补时间'}
                            </div>
                            <h4 className="mt-2 text-lg font-black leading-snug text-slate-900">
                              {experience.title}
                            </h4>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                              {[experience.organizer, experience.role].filter(Boolean).join(' · ') ||
                                '补充主办方和角色后，这条荣誉会更完整。'}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleShowcaseExperience(experience.id)}
                            className={`shrink-0 rounded-[18px] border px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                              selected
                                ? 'border-orange-200 bg-orange-500 text-white hover:bg-orange-600'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                            }`}
                          >
                            {selected ? '已展示' : '加入展示'}
                          </button>
                        </div>

                        <p className="mt-4 text-sm leading-6 text-slate-500">
                          {experience.description || '建议补充这条荣誉对应的过程、结果和个人贡献。'}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${categoryClass}`}
                          >
                            {categoryLabel}
                          </span>
                          {experience.tags.slice(0, 3).map((tag) => (
                            <span
                              key={`${experience.id}-${tag}`}
                              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dashed-line {
          background-image: linear-gradient(to right, #fdba74 55%, transparent 45%);
          background-size: 14px 100%;
        }

        .snake-line {
          background-image: linear-gradient(to bottom, rgba(249, 115, 22, 0.28) 55%, transparent 45%);
          background-size: 100% 16px;
        }
      `}</style>
    </div>
  );
};
