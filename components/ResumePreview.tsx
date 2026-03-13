import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Camera,
  CheckCircle2,
  Edit3,
  FileText,
  Loader2,
  Printer,
  Save,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { DEMO_PROFILE } from '../constants';
import { supabase } from '../lib/supabase';
import {
  generateAdvantagesFromExperiences,
  generateGrowthSummary,
  optimizeResumeEntry,
} from '../services/aiService';
import { updateProfile } from '../services/profileService';
import { uploadProfileAvatar } from '../services/storageService';
import { Experience, ExperienceCategory, Skill, UserProfile } from '../types';

type ResumeTemplate = 'business' | 'classic' | 'split';

type ResumePreviewProps = {
  experiences: Experience[];
  skills: Skill[];
  userProfile: UserProfile | null;
  userId?: string;
  isDemoMode?: boolean;
  onProfileUpdate?: (profile: UserProfile) => void;
  onExperiencesUpdate?: (items: Experience[]) => void;
};

type TemplateOption = {
  id: ResumeTemplate;
  label: string;
  description: string;
};

type EditableProfileKey =
  | 'name'
  | 'email'
  | 'phone'
  | 'location'
  | 'linkedin'
  | 'university'
  | 'major'
  | 'degree'
  | 'gpa'
  | 'courses'
  | 'period'
  | 'gender'
  | 'birthYear'
  | 'ethnicity'
  | 'jobTarget'
  | 'personalAdvantages'
  | 'techPlanning';

type EditableExperienceKey = 'title' | 'organizer' | 'date' | 'role' | 'description';

const TEMPLATE_STORAGE_KEY = 'qing_resume_template';

const templateOptions: TemplateOption[] = [
  {
    id: 'business',
    label: '商务蓝金',
    description: '参考你提供的版式，适合实习与校招投递。',
  },
  {
    id: 'classic',
    label: '专业单栏',
    description: '信息密度更高，适合经历较多的同学。',
  },
  {
    id: 'split',
    label: '双栏履历',
    description: '左侧强调信息与技能，右侧突出经历成果。',
  },
];

const A4_PIXEL_WIDTH = 794;
const A4_PIXEL_HEIGHT = 1123;
const MAX_SINGLE_PAGE_EXPORT_RATIO = 1.08;
const MIN_PREVIEW_SCALE = 0.34;
const MIN_EXPORT_SCALE = 3;
const MAX_EXPORT_SCALE = 4;

const categoryLabelMap: Record<ExperienceCategory, string> = {
  Academic: '学术经历',
  Competition: '竞赛经历',
  Internship: '实习经历',
  Project: '项目经历',
  Campus: '校园经历',
};

const sortExperiences = (items: Experience[]) =>
  [...items].sort((a, b) => b.date.localeCompare(a.date));

const isResumeTemplate = (value: string | null): value is ResumeTemplate =>
  value === 'business' || value === 'classic' || value === 'split';

const readStoredTemplate = (): ResumeTemplate => {
  if (typeof window === 'undefined') {
    return 'business';
  }

  const stored = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
  return isResumeTemplate(stored) ? stored : 'business';
};

const normalizeProfile = (source?: UserProfile | null): UserProfile => ({
  id: source?.id,
  name: source?.name || '',
  email: source?.email || '',
  phone: source?.phone || '',
  location: source?.location || '',
  linkedin: source?.linkedin || '',
  university: source?.university || '',
  major: source?.major || '',
  degree: source?.degree || DEMO_PROFILE.degree || '',
  gpa: source?.gpa || '',
  courses: source?.courses || '',
  period: source?.period || '',
  gender: source?.gender || DEMO_PROFILE.gender || '',
  grade: source?.grade || '',
  birthYear: source?.birthYear || '',
  avatar_url: source?.avatar_url || '',
  ethnicity: source?.ethnicity || '',
  jobTarget: source?.jobTarget || '',
  personalAdvantages: source?.personalAdvantages || '',
  techPlanning: source?.techPlanning || '',
});

const normalizeLines = (value: string) =>
  value
    .split(/\r?\n|•|·/)
    .map((line) => line.trim())
    .filter(Boolean);

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

const getExperienceBullets = (experience: Experience) => {
  const descriptionLines = normalizeLines(experience.description || '');
  if (descriptionLines.length > 0) {
    return descriptionLines;
  }

  if (experience.outcomes?.length) {
    return experience.outcomes.filter(Boolean);
  }

  return ['补充这段经历的行动过程、结果数据和个人贡献。'];
};

const buildResumeSections = (experiences: Experience[]) => {
  const sorted = sortExperiences(experiences);
  const internships = sorted.filter((item) => item.category === 'Internship');
  const campus = sorted.filter((item) => item.category === 'Campus');
  const projects = sorted.filter(
    (item) =>
      item.category === 'Project' ||
      item.category === 'Competition' ||
      item.category === 'Academic',
  );

  return {
    internships: internships.length > 0 ? internships : projects.slice(0, 2),
    campus,
    projects: internships.length > 0 ? projects : projects.slice(2),
  };
};

const formatSkillSummary = (skills: Skill[]) => {
  if (skills.length === 0) {
    return '沟通表达、项目执行、资料整理、Office 办公';
  }

  return skills
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((skill) => skill.name)
    .join('、');
};

const waitForImages = async (container: HTMLElement) => {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.onload = () => resolve();
          image.onerror = () => resolve();
        }),
    ),
  );
};

const getExportScale = (documentHeight: number) => {
  const deviceScale = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const preferredScale = Math.min(
    MAX_EXPORT_SCALE,
    Math.max(MIN_EXPORT_SCALE, Math.round(deviceScale * 2)),
  );

  // Multi-page resumes use a slightly lower capture scale to avoid giant canvases.
  if (documentHeight > A4_PIXEL_HEIGHT * 1.35) {
    return MIN_EXPORT_SCALE;
  }

  return preferredScale;
};

const InlineInput: React.FC<{
  value: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  className?: string;
}> = ({ value, placeholder, onChange, className = '' }) => (
  <input
    value={value}
    placeholder={placeholder}
    onChange={(event) => onChange?.(event.target.value)}
    className={`block min-w-0 max-w-full rounded-lg border border-dashed border-blue-200 bg-blue-50/50 px-2 py-1 font-inherit text-inherit outline-none transition focus:border-blue-500 focus:bg-white ${className}`}
  />
);

const InlineTextarea: React.FC<{
  value: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  rows?: number;
  className?: string;
}> = ({ value, placeholder, onChange, rows = 3, className = '' }) => (
  <textarea
    value={value}
    rows={rows}
    placeholder={placeholder}
    onChange={(event) => onChange?.(event.target.value)}
    className={`block w-full min-w-0 max-w-full rounded-lg border border-dashed border-blue-200 bg-blue-50/50 px-3 py-2 font-inherit text-inherit outline-none transition focus:border-blue-500 focus:bg-white ${className}`}
  />
);

const ResumeRibbonTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-5 flex items-center">
    <div className="flex items-stretch">
      <div className="bg-[#4E7D93] px-5 py-2 text-lg font-bold text-white">{children}</div>
      <div className="border-b-[22px] border-l-[14px] border-b-[#4E7D93] border-l-transparent" />
    </div>
    <div className="ml-4 h-px flex-1 bg-[#4B5563]" />
  </div>
);

const ResumeAvatar: React.FC<{
  profile: UserProfile;
  isEditing?: boolean;
  isUploading?: boolean;
  onUploadClick?: () => void;
}> = ({ profile, isEditing = false, isUploading = false, onUploadClick }) => {
  const avatarContent = profile.avatar_url ? (
    <img
      src={profile.avatar_url}
      alt={`${profile.name || '候选人'}头像`}
      className="h-[166px] w-[126px] rounded-sm border border-slate-300 object-cover"
      crossOrigin="anonymous"
    />
  ) : (
    <div className="flex h-[166px] w-[126px] items-center justify-center rounded-sm border border-slate-300 bg-slate-100 text-4xl font-black text-slate-400">
      {(profile.name || '简').slice(0, 1)}
    </div>
  );

  if (!isEditing) {
    return avatarContent;
  }

  if (profile.avatar_url) {
    return (
      <button
        type="button"
        onClick={onUploadClick}
        className="group relative block overflow-hidden rounded-sm"
      >
        {avatarContent}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-slate-900/70 px-2 py-2 text-xs font-bold text-white opacity-100 transition">
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          更换头像
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onUploadClick}
      className="group relative block overflow-hidden rounded-sm"
    >
      {avatarContent}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-slate-900/70 px-2 py-2 text-xs font-bold text-white opacity-100 transition">
        {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        上传头像
      </div>
    </button>
  );
};

const ResumeList: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="space-y-2 text-[14px] leading-6 text-slate-800">
    {items.map((item, index) => (
      <li key={`${item}-${index}`} className="flex gap-2">
        <span className="mt-[8px] inline-block h-2 w-2 shrink-0 rounded-full bg-slate-700" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const ExperienceBlock: React.FC<{
  experience: Experience;
  isEditing?: boolean;
  loadingId?: string | null;
  onChange?: (id: string, key: EditableExperienceKey, value: string) => void;
  onAIOptimize?: (experience: Experience) => void;
}> = ({ experience, isEditing = false, loadingId, onChange, onAIOptimize }) => (
  <div data-export-block="experience" className="mb-4 break-inside-avoid last:mb-0">
    <div className="mb-1.5 flex flex-wrap items-start justify-between gap-3">
      {isEditing ? (
        <>
          <InlineInput
            value={experience.date || ''}
            placeholder="时间"
            onChange={(value) => onChange?.(experience.id, 'date', value)}
            className="w-[120px] text-[14px] font-bold"
          />
          <InlineInput
            value={experience.organizer || ''}
            placeholder="机构 / 公司"
            onChange={(value) => onChange?.(experience.id, 'organizer', value)}
            className="min-w-[180px] flex-1 text-[15px] font-bold"
          />
          <InlineInput
            value={experience.role || ''}
            placeholder="角色"
            onChange={(value) => onChange?.(experience.id, 'role', value)}
            className="w-[150px] text-[14px] font-semibold"
          />
        </>
      ) : (
        <>
          <div className="text-[14px] font-bold text-slate-900">
            {experience.date || '时间待补充'}
          </div>
          <div className="text-[15px] font-bold text-slate-900">
            {experience.organizer || '机构待补充'}
          </div>
          <div className="text-[14px] font-semibold text-slate-700">
            {experience.role || '角色待补充'}
          </div>
        </>
      )}
    </div>
    <div className="mb-2 flex items-start justify-between gap-3">
      {isEditing ? (
        <InlineInput
          value={experience.title || ''}
          placeholder="经历标题"
          onChange={(value) => onChange?.(experience.id, 'title', value)}
          className="flex-1 text-[16px] font-black tracking-wide"
        />
      ) : (
        <div className="text-[16px] font-black tracking-wide text-slate-900">{experience.title}</div>
      )}

      {isEditing && onAIOptimize && (
        <button
          type="button"
          onClick={() => onAIOptimize(experience)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700"
        >
          {loadingId === experience.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="h-3.5 w-3.5" />
          )}
          AI润色
        </button>
      )}
    </div>

    {isEditing ? (
      <InlineTextarea
        value={normalizeLines(experience.description || '').join('\n')}
        placeholder="建议一行一个要点，突出行动、结果和数据。"
        rows={Math.max(3, Math.min(6, getExperienceBullets(experience).length + 1))}
        onChange={(value) => onChange?.(experience.id, 'description', value)}
        className="text-[14px] leading-6"
      />
    ) : (
      <ResumeList items={getExperienceBullets(experience)} />
    )}
  </div>
);

const BusinessSection: React.FC<{
  title: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <section data-export-block="section" className="mb-5 break-inside-avoid">
    <ResumeRibbonTitle>{title}</ResumeRibbonTitle>
    {children}
  </section>
);

const ResumeDocument: React.FC<{
  profile: UserProfile;
  experiences: Experience[];
  skills: Skill[];
  template: ResumeTemplate;
  isEditing?: boolean;
  loadingId?: string | null;
  isUploadingAvatar?: boolean;
  onProfileChange?: (key: EditableProfileKey, value: string) => void;
  onExperienceChange?: (id: string, key: EditableExperienceKey, value: string) => void;
  onAvatarUploadClick?: () => void;
  onAIOptimizeExperience?: (experience: Experience) => void;
  onGenerateAdvantages?: () => void;
  onGeneratePlanning?: () => void;
}> = ({
  profile,
  experiences,
  skills,
  template,
  isEditing = false,
  loadingId,
  isUploadingAvatar = false,
  onProfileChange,
  onExperienceChange,
  onAvatarUploadClick,
  onAIOptimizeExperience,
  onGenerateAdvantages,
  onGeneratePlanning,
}) => {
  const sections = buildResumeSections(experiences);
  const skillsSummary = formatSkillSummary(skills);
  const basicInfoLeft: Array<{ label: string; key: EditableProfileKey; value: string; placeholder: string }> = [
    { label: '姓名', key: 'name', value: profile.name || '', placeholder: '待填写' },
    { label: '民族', key: 'ethnicity', value: profile.ethnicity || '', placeholder: '待填写' },
    { label: '性别', key: 'gender', value: profile.gender || '', placeholder: '待填写' },
    { label: '所在城市', key: 'location', value: profile.location || '', placeholder: '待填写' },
  ];
  const basicInfoRight: Array<{ label: string; key: EditableProfileKey; value: string; placeholder: string }> = [
    { label: '求职意向', key: 'jobTarget', value: profile.jobTarget || '', placeholder: '个性化实习岗位' },
    { label: '出生年月', key: 'birthYear', value: profile.birthYear || '', placeholder: '待填写' },
    { label: '电子邮箱', key: 'email', value: profile.email || '', placeholder: '待填写' },
    { label: '联系方式', key: 'phone', value: profile.phone || '', placeholder: '待填写' },
  ];

  if (template === 'business') {
    return (
      <div className="w-[794px] min-h-[1123px] bg-white px-7 pb-7 pt-5 text-slate-900">
        <div className="mb-4">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="text-[54px] font-light tracking-[0.1em] text-[#547487]">个人简历</div>
              <div className="mt-1 text-xs font-semibold tracking-[0.46em] text-slate-400">
                QING RESUME
              </div>
            </div>
            <div className="flex gap-2.5 pt-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C89914] text-white">
                <FileText size={18} />
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C89914] text-white">
                <Sparkles size={18} />
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C89914] text-white">
                <Printer size={18} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-3.5 flex-1 bg-[#4E7D93]" />
            <div className="h-3.5 w-8 skew-x-[-24deg] bg-white" />
            <div className="h-3.5 flex-1 bg-[#C89914]" />
          </div>
        </div>

        <BusinessSection title="基本信息">
          <div className="grid grid-cols-[1fr_1fr_138px] gap-4 border-l border-slate-300 pl-6 pr-2">
            <div className="space-y-1.5 text-[14px] leading-6 text-slate-800">
              {basicInfoLeft.map((item) => (
                <div key={item.key}>
                  <span className="font-semibold">{item.label}：</span>
                  {isEditing ? (
                    <InlineInput
                      value={item.value}
                      placeholder={item.placeholder}
                      onChange={(value) => onProfileChange?.(item.key, value)}
                      className="ml-1 inline-flex w-[130px] px-2 py-0.5 text-[14px]"
                    />
                  ) : (
                    <span>{item.value || item.placeholder}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-1.5 text-[14px] leading-6 text-slate-800">
              {basicInfoRight.map((item) => (
                <div key={item.key}>
                  <span className="font-semibold">{item.label}：</span>
                  {isEditing ? (
                    <InlineInput
                      value={item.value}
                      placeholder={item.placeholder}
                      onChange={(value) => onProfileChange?.(item.key, value)}
                      className="ml-1 inline-flex w-[150px] px-2 py-0.5 text-[14px]"
                    />
                  ) : (
                    <span>{item.value || item.placeholder}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-center">
              <ResumeAvatar
                profile={profile}
                isEditing={isEditing}
                isUploading={isUploadingAvatar}
                onUploadClick={onAvatarUploadClick}
              />
            </div>
          </div>
        </BusinessSection>

        <BusinessSection title="教育背景">
          <div className="border-l border-slate-300 pl-6">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
              {isEditing ? (
                <>
                  <InlineInput
                    value={profile.period || ''}
                    placeholder="时间待填写"
                    onChange={(value) => onProfileChange?.('period', value)}
                    className="w-[170px] text-[16px] font-bold"
                  />
                  <InlineInput
                    value={profile.university || ''}
                    placeholder="学校待填写"
                    onChange={(value) => onProfileChange?.('university', value)}
                    className="min-w-[180px] flex-1 text-[18px] font-bold"
                  />
                  <div className="flex gap-2">
                    <InlineInput
                      value={profile.major || ''}
                      placeholder="专业"
                      onChange={(value) => onProfileChange?.('major', value)}
                      className="w-[120px] text-[15px] font-semibold"
                    />
                    <InlineInput
                      value={profile.degree || ''}
                      placeholder="学历"
                      onChange={(value) => onProfileChange?.('degree', value)}
                      className="w-[88px] text-[15px] font-semibold"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[16px] font-bold text-slate-900">
                    {profile.period || '时间待填写'}
                  </div>
                  <div className="text-[18px] font-bold text-slate-900">
                    {profile.university || '学校待填写'}
                  </div>
                  <div className="text-[15px] font-semibold text-slate-700">
                    {[profile.major, profile.degree].filter(Boolean).join(' / ') || '专业 / 学历待填写'}
                  </div>
                </>
              )}
            </div>
            <div className="mb-1.5 text-[14px] leading-6 text-slate-800">
              <span className="font-bold">成绩表现：</span>
              {isEditing ? (
                <InlineInput
                  value={profile.gpa || ''}
                  placeholder="建议补充绩点、排名、奖学金"
                  onChange={(value) => onProfileChange?.('gpa', value)}
                  className="ml-1 w-[260px] px-2 py-0.5 text-[14px]"
                />
              ) : profile.gpa ? (
                `平均绩点 ${profile.gpa}`
              ) : (
                '建议补充绩点、排名、奖学金或其他可量化的成绩表现。'
              )}
            </div>
            <div className="text-[14px] leading-6 text-slate-800">
              <span className="font-bold">核心课程：</span>
              {isEditing ? (
                <div className="mt-1">
                  <InlineTextarea
                    value={profile.courses || ''}
                    placeholder="建议补充与目标岗位相关的核心课程。"
                    onChange={(value) => onProfileChange?.('courses', value)}
                    rows={3}
                    className="text-[14px] leading-6"
                  />
                </div>
              ) : (
                profile.courses || '建议补充与目标岗位相关的核心课程。'
              )}
            </div>
          </div>
        </BusinessSection>

        <BusinessSection title="实习经历">
          <div className="border-l border-slate-300 pl-6">
            {sections.internships.length > 0 ? (
              sections.internships.map((experience) => (
                <ExperienceBlock
                  key={experience.id}
                  experience={experience}
                  isEditing={isEditing}
                  loadingId={loadingId}
                  onChange={onExperienceChange}
                  onAIOptimize={onAIOptimizeExperience}
                />
              ))
            ) : (
              <div className="text-[14px] leading-6 text-slate-700">
                还没有录入实习经历，建议先补充项目、校园或竞赛经历。
              </div>
            )}
          </div>
        </BusinessSection>

        <BusinessSection title="校园经历">
          <div className="border-l border-slate-300 pl-6">
            {sections.campus.length > 0 ? (
              sections.campus.map((experience) => (
                <ExperienceBlock
                  key={experience.id}
                  experience={experience}
                  isEditing={isEditing}
                  loadingId={loadingId}
                  onChange={onExperienceChange}
                  onAIOptimize={onAIOptimizeExperience}
                />
              ))
            ) : (
              <div className="text-[14px] leading-6 text-slate-700">
                暂无校园经历，建议补充学生组织、志愿活动或校园项目。
              </div>
            )}
          </div>
        </BusinessSection>

        {sections.projects.length > 0 && (
          <BusinessSection title="项目经历">
            <div className="border-l border-slate-300 pl-6">
              {sections.projects.map((experience) => (
                <ExperienceBlock
                  key={experience.id}
                  experience={experience}
                  isEditing={isEditing}
                  loadingId={loadingId}
                  onChange={onExperienceChange}
                  onAIOptimize={onAIOptimizeExperience}
                />
              ))}
            </div>
          </BusinessSection>
        )}

        <BusinessSection title="技能证书">
          <div className="border-l border-slate-300 pl-6 text-[14px] leading-6 text-slate-800">
            <div className="mb-1.5">
              <span className="font-bold">技能标签：</span>
              {skillsSummary}
            </div>
            <div>
              <span className="font-bold">其他补充：</span>
              {isEditing ? (
                <InlineInput
                  value={profile.linkedin || ''}
                  placeholder="可补充作品集、社交主页、证书或工具熟练度。"
                  onChange={(value) => onProfileChange?.('linkedin', value)}
                  className="ml-1 w-[320px] px-2 py-0.5 text-[14px]"
                />
              ) : (
                profile.linkedin || '可补充作品集、社交主页、证书或工具熟练度。'
              )}
            </div>
          </div>
        </BusinessSection>

        <BusinessSection title="自我评价">
          <div className="border-l border-slate-300 pl-6 text-[14px] leading-7 text-slate-800">
            {isEditing ? (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onGenerateAdvantages}
                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700"
                  >
                    {loadingId === 'advantages' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5" />
                    )}
                    AI生成自评
                  </button>
                </div>
                <InlineTextarea
                  value={profile.personalAdvantages || ''}
                  placeholder="建议围绕执行力、沟通力、学习速度和岗位适配度，写成 3 到 4 句具有说服力的中文表达。"
                  onChange={(value) => onProfileChange?.('personalAdvantages', value)}
                  rows={5}
                  className="text-[14px] leading-7"
                />
              </div>
            ) : (
              profile.personalAdvantages ||
              '建议围绕执行力、沟通力、学习速度和岗位适配度，写成 3 到 4 句具有说服力的中文表达。'
            )}
          </div>
        </BusinessSection>

        <BusinessSection title="成长规划">
          <div className="border-l border-slate-300 pl-6 text-[14px] leading-7 text-slate-800">
            {isEditing ? (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onGeneratePlanning}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700"
                  >
                    {loadingId === 'planning' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    AI生成规划
                  </button>
                </div>
                <InlineTextarea
                  value={profile.techPlanning || ''}
                  placeholder="建议补充短期提升方向、目标岗位与下一步行动计划。"
                  onChange={(value) => onProfileChange?.('techPlanning', value)}
                  rows={5}
                  className="text-[14px] leading-7"
                />
              </div>
            ) : (
              profile.techPlanning || '建议补充短期提升方向、目标岗位与下一步行动计划。'
            )}
          </div>
        </BusinessSection>
      </div>
    );
  }

  if (template === 'classic') {
    return (
      <div className="w-[794px] min-h-[1123px] bg-white px-10 py-10 text-slate-900">
        <div className="mb-8 border-b-4 border-[#A44B4F] pb-5">
          <div className="grid grid-cols-[minmax(0,1fr)_138px] gap-6">
            <div className="min-w-0">
              <div className="mb-2 flex items-end justify-between gap-4">
                {isEditing ? (
                  <>
                    <InlineInput
                      value={profile.name || ''}
                      placeholder="个人简历"
                      onChange={(value) => onProfileChange?.('name', value)}
                      className="min-w-0 flex-1 text-[38px] font-black tracking-[0.08em]"
                    />
                    <InlineInput
                      value={profile.jobTarget || ''}
                      placeholder="精准实习匹配方向"
                      onChange={(value) => onProfileChange?.('jobTarget', value)}
                      className="w-[220px] shrink-0 text-[16px] font-bold text-[#A44B4F]"
                    />
                  </>
                ) : (
                  <>
                    <div className="min-w-0 text-[38px] font-black tracking-[0.08em] text-slate-900">
                      {profile.name || '个人简历'}
                    </div>
                    <div className="shrink-0 text-[16px] font-bold text-[#A44B4F]">
                      {profile.jobTarget || '精准实习匹配方向'}
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate-600">
                {isEditing ? (
                  <>
                    <InlineInput
                      value={profile.phone || ''}
                      placeholder="联系方式待填写"
                      onChange={(value) => onProfileChange?.('phone', value)}
                      className="w-[140px] text-[13px]"
                    />
                    <InlineInput
                      value={profile.email || ''}
                      placeholder="邮箱待填写"
                      onChange={(value) => onProfileChange?.('email', value)}
                      className="w-[180px] text-[13px]"
                    />
                    <InlineInput
                      value={profile.location || ''}
                      placeholder="城市待填写"
                      onChange={(value) => onProfileChange?.('location', value)}
                      className="w-[110px] text-[13px]"
                    />
                    <InlineInput
                      value={[profile.university, profile.major].filter(Boolean).join(' / ')}
                      placeholder="教育背景待填写"
                      onChange={(value) => {
                        const [university, major] = value.split('/').map((item) => item.trim());
                        onProfileChange?.('university', university || '');
                        onProfileChange?.('major', major || '');
                      }}
                      className="w-[240px] text-[13px]"
                    />
                  </>
                ) : (
                  <>
                    <span>{profile.phone || '联系方式待填写'}</span>
                    <span>{profile.email || '邮箱待填写'}</span>
                    <span>{profile.location || '城市待填写'}</span>
                    <span>
                      {[profile.university, profile.major].filter(Boolean).join(' / ') || '教育背景待填写'}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-2 shadow-sm">
                <ResumeAvatar
                  profile={profile}
                  isEditing={isEditing}
                  isUploading={isUploadingAvatar}
                  onUploadClick={onAvatarUploadClick}
                />
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {isEditing ? '点击头像上传' : 'Profile Photo'}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-7">
          <section className="break-inside-avoid">
            <div className="mb-3 text-[18px] font-black tracking-[0.2em] text-[#A44B4F]">教育背景</div>
            <div className="rounded-2xl bg-slate-50 px-5 py-4 text-[15px] leading-7">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-[150px_minmax(0,1fr)_minmax(0,190px)] gap-3">
                    <InlineInput
                      value={profile.period || ''}
                      placeholder="时间待填写"
                      onChange={(value) => onProfileChange?.('period', value)}
                      className="w-full"
                    />
                    <InlineInput
                      value={profile.university || ''}
                      placeholder="学校待填写"
                      onChange={(value) => onProfileChange?.('university', value)}
                      className="w-full"
                    />
                    <div className="flex min-w-0 gap-2">
                      <InlineInput
                        value={profile.major || ''}
                        placeholder="专业"
                        onChange={(value) => onProfileChange?.('major', value)}
                        className="min-w-0 flex-1"
                      />
                      <InlineInput
                        value={profile.degree || ''}
                        placeholder="学历"
                        onChange={(value) => onProfileChange?.('degree', value)}
                        className="min-w-0 flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    成绩表现：
                    <InlineInput
                      value={profile.gpa || ''}
                      placeholder="建议补充绩点、排名或奖学金。"
                      onChange={(value) => onProfileChange?.('gpa', value)}
                      className="ml-2 w-[260px]"
                    />
                  </div>
                  <InlineTextarea
                    value={profile.courses || ''}
                    placeholder="建议补充与目标岗位相关课程。"
                    onChange={(value) => onProfileChange?.('courses', value)}
                    rows={3}
                  />
                </div>
              ) : (
                <>
                  <div className="font-bold text-slate-900">
                    {profile.period || '时间待填写'} | {profile.university || '学校待填写'} |{' '}
                    {[profile.major, profile.degree].filter(Boolean).join(' / ') || '专业 / 学历待填写'}
                  </div>
                  <div>成绩表现：{profile.gpa || '建议补充绩点、排名或奖学金。'}</div>
                  <div>核心课程：{profile.courses || '建议补充与目标岗位相关课程。'}</div>
                </>
              )}
            </div>
          </section>

          <section className="break-inside-avoid">
            <div className="mb-3 text-[18px] font-black tracking-[0.2em] text-[#A44B4F]">核心优势</div>
            <div className="rounded-2xl bg-slate-50 px-5 py-4 text-[15px] leading-7">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={onGenerateAdvantages}
                      className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700"
                    >
                      {loadingId === 'advantages' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5" />
                      )}
                      AI生成自评
                    </button>
                  </div>
                  <InlineTextarea
                    value={profile.personalAdvantages || ''}
                    placeholder="建议聚焦执行、协作、学习速度与结果导向，用三到四条简明的句子表达。"
                    onChange={(value) => onProfileChange?.('personalAdvantages', value)}
                    rows={5}
                  />
                </div>
              ) : (
                profile.personalAdvantages ||
                '建议聚焦执行、协作、学习速度与结果导向，用三到四条简明的句子表达。'
              )}
            </div>
          </section>

          <section className="break-inside-avoid">
            <div className="mb-3 text-[18px] font-black tracking-[0.2em] text-[#A44B4F]">
              实习 / 实践经历
            </div>
            <div className="space-y-5">
              {(sections.internships.length > 0 ? sections.internships : experiences).map((experience) => (
                <div key={experience.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    {isEditing ? (
                      <InlineInput
                        value={experience.title || ''}
                        placeholder="经历标题"
                        onChange={(value) => onExperienceChange?.(experience.id, 'title', value)}
                        className="flex-1 text-[17px] font-black"
                      />
                    ) : (
                      <div className="text-[17px] font-black text-slate-900">{experience.title}</div>
                    )}
                    <div className="text-sm font-semibold text-slate-500">{categoryLabelMap[experience.category]}</div>
                  </div>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <InlineInput
                          value={experience.date || ''}
                          placeholder="时间待填写"
                          onChange={(value) => onExperienceChange?.(experience.id, 'date', value)}
                        />
                        <InlineInput
                          value={experience.organizer || ''}
                          placeholder="机构待填写"
                          onChange={(value) => onExperienceChange?.(experience.id, 'organizer', value)}
                        />
                        <InlineInput
                          value={experience.role || ''}
                          placeholder="角色待填写"
                          onChange={(value) => onExperienceChange?.(experience.id, 'role', value)}
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => onAIOptimizeExperience?.(experience)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700"
                        >
                          {loadingId === experience.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Wand2 className="h-3.5 w-3.5" />
                          )}
                          AI润色
                        </button>
                      </div>
                      <InlineTextarea
                        value={normalizeLines(experience.description || '').join('\n')}
                        placeholder="建议一行一个要点，突出行动、结果和数据。"
                        onChange={(value) => onExperienceChange?.(experience.id, 'description', value)}
                        rows={Math.max(3, Math.min(6, getExperienceBullets(experience).length + 1))}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-500">
                        <span>{experience.date || '时间待填写'}</span>
                        <span>{experience.organizer || '机构待填写'}</span>
                        <span>{experience.role || '角色待填写'}</span>
                      </div>
                      <ResumeList items={getExperienceBullets(experience)} />
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="grid w-[794px] min-h-[1123px] grid-cols-[220px_1fr] bg-white text-slate-900">
      <aside className="flex flex-col bg-[#305B70] px-6 py-8 text-white">
        <div className="mb-6 flex justify-center">
          <div className="overflow-hidden rounded-3xl border-4 border-white/30">
            <ResumeAvatar
              profile={profile}
              isEditing={isEditing}
              isUploading={isUploadingAvatar}
              onUploadClick={onAvatarUploadClick}
            />
          </div>
        </div>
        <div className="mb-6 text-center">
          {isEditing ? (
            <div className="space-y-2">
              <InlineInput
                value={profile.name || ''}
                placeholder="个人简历"
                onChange={(value) => onProfileChange?.('name', value)}
                className="w-full text-center text-[28px] font-black tracking-[0.12em] text-slate-900"
              />
              <InlineInput
                value={profile.jobTarget || ''}
                placeholder="精准实习匹配方向"
                onChange={(value) => onProfileChange?.('jobTarget', value)}
                className="w-full text-center text-sm font-semibold text-slate-700"
              />
            </div>
          ) : (
            <>
              <div className="text-[28px] font-black tracking-[0.12em]">{profile.name || '个人简历'}</div>
              <div className="mt-2 text-sm font-semibold text-white/80">
                {profile.jobTarget || '精准实习匹配方向'}
              </div>
            </>
          )}
        </div>

        <div className="mb-5">
          <div className="mb-3 text-sm font-black tracking-[0.25em] text-white/70">基本信息</div>
          <div className="space-y-2 text-[13px] leading-6 text-white/90">
            {isEditing ? (
              <>
                <InlineInput value={profile.phone || ''} placeholder="联系方式待填写" onChange={(value) => onProfileChange?.('phone', value)} className="w-full text-[13px] text-slate-900" />
                <InlineInput value={profile.email || ''} placeholder="邮箱待填写" onChange={(value) => onProfileChange?.('email', value)} className="w-full text-[13px] text-slate-900" />
                <InlineInput value={profile.location || ''} placeholder="城市待填写" onChange={(value) => onProfileChange?.('location', value)} className="w-full text-[13px] text-slate-900" />
                <InlineInput value={profile.birthYear || ''} placeholder="出生年月待填写" onChange={(value) => onProfileChange?.('birthYear', value)} className="w-full text-[13px] text-slate-900" />
                <InlineInput value={profile.ethnicity || ''} placeholder="民族待填写" onChange={(value) => onProfileChange?.('ethnicity', value)} className="w-full text-[13px] text-slate-900" />
                <InlineInput value={profile.gender || ''} placeholder="性别待填写" onChange={(value) => onProfileChange?.('gender', value)} className="w-full text-[13px] text-slate-900" />
              </>
            ) : (
              <>
                <div>{profile.phone || '联系方式待填写'}</div>
                <div>{profile.email || '邮箱待填写'}</div>
                <div>{profile.location || '城市待填写'}</div>
                <div>{profile.birthYear || '出生年月待填写'}</div>
                <div>{profile.ethnicity || '民族待填写'}</div>
                <div>{profile.gender || '性别待填写'}</div>
              </>
            )}
          </div>
        </div>

        <div className="mb-5">
          <div className="mb-3 text-sm font-black tracking-[0.25em] text-white/70">教育背景</div>
          <div className="space-y-2 text-[13px] leading-6 text-white/90">
            {isEditing ? (
              <>
                <InlineInput value={profile.university || ''} placeholder="学校待填写" onChange={(value) => onProfileChange?.('university', value)} className="w-full text-[13px] text-slate-900" />
                <InlineInput value={[profile.major, profile.degree].filter(Boolean).join(' / ')} placeholder="专业 / 学历待填写" onChange={(value) => {
                  const [major, degree] = value.split('/').map((item) => item.trim());
                  onProfileChange?.('major', major || '');
                  onProfileChange?.('degree', degree || '');
                }} className="w-full text-[13px] text-slate-900" />
                <InlineInput value={profile.period || ''} placeholder="时间待填写" onChange={(value) => onProfileChange?.('period', value)} className="w-full text-[13px] text-slate-900" />
                <InlineInput value={profile.gpa || ''} placeholder="绩点待填写" onChange={(value) => onProfileChange?.('gpa', value)} className="w-full text-[13px] text-slate-900" />
              </>
            ) : (
              <>
                <div>{profile.university || '学校待填写'}</div>
                <div>{[profile.major, profile.degree].filter(Boolean).join(' / ') || '专业 / 学历待填写'}</div>
                <div>{profile.period || '时间待填写'}</div>
                <div>{profile.gpa || '绩点待填写'}</div>
              </>
            )}
          </div>
        </div>

        <div className="mb-5">
          <div className="mb-3 text-sm font-black tracking-[0.25em] text-white/70">技能标签</div>
          <div className="text-[13px] leading-6 text-white/90">{skillsSummary}</div>
        </div>

        <div>
          <div className="mb-3 text-sm font-black tracking-[0.25em] text-white/70">自我评价</div>
          <div className="text-[13px] leading-6 text-white/90">
            {isEditing ? (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onGenerateAdvantages}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white"
                  >
                    {loadingId === 'advantages' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    AI自评
                  </button>
                </div>
                <InlineTextarea
                  value={profile.personalAdvantages || ''}
                  placeholder="建议用简短有力的语言总结个人优势与岗位匹配度。"
                  onChange={(value) => onProfileChange?.('personalAdvantages', value)}
                  rows={6}
                  className="text-[13px] leading-6 text-slate-900"
                />
              </div>
            ) : (
              profile.personalAdvantages || '建议用简短有力的语言总结个人优势与岗位匹配度。'
            )}
          </div>
        </div>
      </aside>

      <main className="px-8 py-8">
        <section className="mb-7 break-inside-avoid">
          <div className="mb-3 border-b-2 border-[#305B70] pb-2 text-[18px] font-black tracking-[0.2em] text-[#305B70]">
            实习 / 项目经历
          </div>
          <div className="space-y-5">
            {(sections.internships.length > 0 ? sections.internships : experiences).map((experience) => (
              <ExperienceBlock
                key={experience.id}
                experience={experience}
                isEditing={isEditing}
                loadingId={loadingId}
                onChange={onExperienceChange}
                onAIOptimize={onAIOptimizeExperience}
              />
            ))}
          </div>
        </section>

        <section className="break-inside-avoid">
          <div className="mb-3 border-b-2 border-[#305B70] pb-2 text-[18px] font-black tracking-[0.2em] text-[#305B70]">
            成长规划
          </div>
          <div className="text-[15px] leading-7 text-slate-700">
            {isEditing ? (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onGeneratePlanning}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700"
                  >
                    {loadingId === 'planning' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    AI规划
                  </button>
                </div>
                <InlineTextarea
                  value={profile.techPlanning || ''}
                  placeholder="建议补充短期成长方向、目标岗位和下一阶段行动计划。"
                  onChange={(value) => onProfileChange?.('techPlanning', value)}
                  rows={6}
                  className="text-[15px] leading-7"
                />
              </div>
            ) : (
              profile.techPlanning || '建议补充短期成长方向、目标岗位和下一阶段行动计划。'
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export const ResumePreview: React.FC<ResumePreviewProps> = ({
  experiences,
  skills,
  userProfile,
  userId,
  isDemoMode = false,
  onProfileUpdate,
  onExperiencesUpdate,
}) => {
  const [profile, setProfile] = useState<UserProfile>(normalizeProfile(userProfile || DEMO_PROFILE));
  const [editableExperiences, setEditableExperiences] = useState<Experience[]>(sortExperiences(experiences));
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>(readStoredTemplate);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const exportSourceRef = useRef<HTMLDivElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const previewDocumentRef = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewDocumentHeight, setPreviewDocumentHeight] = useState(A4_PIXEL_HEIGHT);

  useEffect(() => {
    setProfile(normalizeProfile(userProfile || DEMO_PROFILE));
  }, [userProfile]);

  useEffect(() => {
    setEditableExperiences(sortExperiences(experiences));
  }, [experiences]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, selectedTemplate);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    const updatePreviewLayout = () => {
      const viewport = previewViewportRef.current;
      const documentNode = previewDocumentRef.current;

      if (!viewport || !documentNode) {
        return;
      }

      const nextHeight = Math.max(documentNode.scrollHeight, documentNode.offsetHeight, A4_PIXEL_HEIGHT);
      const nextScale = Math.min(
        1,
        Math.max(MIN_PREVIEW_SCALE, viewport.clientWidth / A4_PIXEL_WIDTH),
      );

      setPreviewDocumentHeight(nextHeight);
      setPreviewScale(nextScale);
    };

    updatePreviewLayout();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updatePreviewLayout);
      return () => window.removeEventListener('resize', updatePreviewLayout);
    }

    const observer = new ResizeObserver(() => {
      updatePreviewLayout();
    });

    if (previewViewportRef.current) {
      observer.observe(previewViewportRef.current);
    }

    if (previewDocumentRef.current) {
      observer.observe(previewDocumentRef.current);
    }

    window.addEventListener('resize', updatePreviewLayout);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePreviewLayout);
    };
  }, []);

  const handleProfileChange = (key: keyof UserProfile, value: string) => {
    setProfile((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleExperienceChange = (id: string, key: keyof Experience, value: string) => {
    setEditableExperiences((current) =>
      current.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  };

  const handleAIFormatExperience = async (experience: Experience) => {
    setLoadingId(experience.id);
    setNotice(null);

    try {
      const optimized = await optimizeResumeEntry(experience.description, {
        title: experience.title,
        role: experience.role,
      });

      setEditableExperiences((current) =>
        current.map((item) => (item.id === experience.id ? { ...item, description: optimized } : item)),
      );
      setNotice('这段经历已经按简历表达方式润色完成。');
    } catch (error) {
      console.error(error);
      setNotice('经历润色失败，请稍后重试。');
    } finally {
      setLoadingId(null);
    }
  };

  const handleGenerateAdvantages = async () => {
    setLoadingId('advantages');
    setNotice(null);

    try {
      const result = await generateAdvantagesFromExperiences(editableExperiences);
      handleProfileChange('personalAdvantages', result);
      setNotice('已根据经历生成自我评价草稿。');
    } catch (error) {
      console.error(error);
      setNotice('自我评价生成失败，请稍后重试。');
    } finally {
      setLoadingId(null);
    }
  };

  const handleGeneratePlanning = async () => {
    setLoadingId('planning');
    setNotice(null);

    try {
      const result = await generateGrowthSummary(editableExperiences);
      const summary = `成长轨迹：${result.trajectory}\n\n核心优势：${result.strengths}\n\n下一步建议：${result.improvements}`;
      handleProfileChange('techPlanning', summary);
      setNotice('已根据经历生成成长规划建议。');
    } catch (error) {
      console.error(error);
      setNotice('成长规划生成失败，请稍后重试。');
    } finally {
      setLoadingId(null);
    }
  };

  const triggerAvatarUpload = () => {
    if (!isEditing || isUploadingAvatar) {
      return;
    }

    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setNotice('请上传 JPG、PNG、WebP 等图片格式作为头像。');
      return;
    }

    setIsUploadingAvatar(true);
    setNotice(null);

    try {
      if (isDemoMode || !userId) {
        const dataUrl = await fileToDataUrl(file);
        handleProfileChange('avatar_url', dataUrl);
        setNotice('头像已更新，当前为本地预览效果。');
        return;
      }

      const avatarUrl = await uploadProfileAvatar(file, userId);
      handleProfileChange('avatar_url', avatarUrl);
      setNotice('头像已上传，保存简历后会同步到档案。');
    } catch (error) {
      console.error(error);
      setNotice('头像上传失败，请稍后重试。');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const cancelEditing = () => {
    setProfile(normalizeProfile(userProfile || DEMO_PROFILE));
    setEditableExperiences(sortExperiences(experiences));
    setIsEditing(false);
    setNotice('已恢复到上一次保存的内容。');
  };

  const saveAllChanges = async () => {
    setIsSaving(true);
    setNotice(null);

    try {
      const nextExperiences = editableExperiences.map((item) => ({
        ...item,
        user_id: userId || item.user_id,
      }));

      if (isDemoMode) {
        onProfileUpdate?.(profile);
        onExperiencesUpdate?.(nextExperiences);
        setIsEditing(false);
        setNotice('演示模式下已更新本页预览内容。');
        return;
      }

      if (!userId) {
        throw new Error('当前未找到用户身份，无法保存简历。');
      }

      const profileResult = await updateProfile({
        id: userId,
        ...profile,
      });

      const { error } = await supabase.from('experiences').upsert(nextExperiences, {
        onConflict: 'id',
      });

      if (error) {
        throw error;
      }

      const savedProfile = {
        ...profile,
        id: userId,
      };

      onProfileUpdate?.(savedProfile);
      onExperiencesUpdate?.(nextExperiences);
      setProfile(savedProfile);
      setEditableExperiences(nextExperiences);
      setIsEditing(false);
      setNotice(
        profileResult.schemaIssue
          ? '已保存简历内容。Supabase profiles 表缺少部分扩展字段，系统已自动做兼容处理。'
          : '简历内容已保存。',
      );
    } catch (error) {
      console.error(error);
      setNotice(error instanceof Error ? error.message : '保存失败，请稍后重试。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    const source = exportSourceRef.current;
    if (!source) {
      setNotice('导出节点未就绪，请稍后重试。');
      return;
    }

    setIsExporting(true);
    setNotice(null);

    const exportNode = source.cloneNode(true) as HTMLDivElement;
    exportNode.style.position = 'absolute';
    exportNode.style.left = '-10000px';
    exportNode.style.top = '0';
    exportNode.style.zIndex = '1';
    exportNode.style.width = `${A4_PIXEL_WIDTH}px`;
    exportNode.style.minHeight = `${A4_PIXEL_HEIGHT}px`;
    exportNode.style.background = '#ffffff';
    exportNode.style.pointerEvents = 'none';

    try {
      document.body.appendChild(exportNode);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await waitForImages(exportNode);

      const templateLabel =
        templateOptions.find((item) => item.id === selectedTemplate)?.label || '个性化实习履历';
      const exportScale = getExportScale(exportNode.scrollHeight);

      const canvas = await html2canvas(exportNode, {
        scale: exportScale,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
        scrollX: 0,
        scrollY: 0,
        width: exportNode.scrollWidth,
        height: exportNode.scrollHeight,
        windowWidth: exportNode.scrollWidth,
        windowHeight: exportNode.scrollHeight,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const fullImageHeight = (canvas.height * pageWidth) / canvas.width;

      if (fullImageHeight <= pageHeight * MAX_SINGLE_PAGE_EXPORT_RATIO) {
        const ratio = pageHeight / fullImageHeight;
        const targetWidth = pageWidth * ratio;
        const horizontalOffset = (pageWidth - targetWidth) / 2;
        const imageData = canvas.toDataURL('image/png', 1);

        pdf.addImage(
          imageData,
          'PNG',
          horizontalOffset,
          0,
          targetWidth,
          pageHeight,
          undefined,
          'SLOW',
        );
        pdf.save(`${profile.name || '青网站简历'}-${templateLabel}.pdf`);
        setNotice('PDF 导出完成，已提升导出清晰度并尽量保持在第一页内。');
        return;
      }

      const pageHeightInPixels = Math.floor((canvas.width * pageHeight) / pageWidth);
      const exportRect = exportNode.getBoundingClientRect();
      const domToCanvasRatio = canvas.height / Math.max(exportNode.scrollHeight, 1);
      const pageBreakCandidates = Array.from(exportNode.querySelectorAll('[data-export-block]'))
        .map((element) => {
          const rect = (element as HTMLElement).getBoundingClientRect();
          return Math.round((rect.top - exportRect.top) * domToCanvasRatio);
        })
        .filter((value, index, collection) => {
          return value > 0 && value < canvas.height && collection.indexOf(value) === index;
        })
        .sort((a, b) => a - b);

      let renderedHeight = 0;
      let pageIndex = 0;

      while (renderedHeight < canvas.height) {
        const proposedEnd = Math.min(renderedHeight + pageHeightInPixels, canvas.height);
        const minFillHeight = renderedHeight + Math.floor(pageHeightInPixels * 0.68);
        const preferredBreak = pageBreakCandidates
          .filter((value) => value > minFillHeight && value < proposedEnd)
          .pop();
        const sliceEnd = proposedEnd === canvas.height ? proposedEnd : preferredBreak || proposedEnd;
        const sliceHeight = Math.max(1, sliceEnd - renderedHeight);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;

        const context = pageCanvas.getContext('2d');
        if (!context) {
          throw new Error('无法创建 PDF 导出画布。');
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(
          canvas,
          0,
          renderedHeight,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight,
        );

        const imageData = pageCanvas.toDataURL('image/png', 1);
        const imageHeight = (sliceHeight * pageWidth) / canvas.width;

        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.addImage(imageData, 'PNG', 0, 0, pageWidth, imageHeight, undefined, 'SLOW');

        renderedHeight += sliceHeight;
        pageIndex += 1;
      }

      pdf.save(`${profile.name || '青网站简历'}-${templateLabel}.pdf`);

      setNotice('PDF 导出完成，已提升导出清晰度。');
    } catch (error) {
      console.error(error);
      setNotice('PDF 导出失败，请稍后重试。');
    } finally {
      if (exportNode.parentNode) {
        exportNode.parentNode.removeChild(exportNode);
      }
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/60 bg-white/85 p-5 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.28em] text-blue-500">
              Personalized Internship Resume
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">个性化实习履历</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              支持多模板切换、移动端浏览和稳定 PDF 导出，整体前端风格保持在原网站基础之上。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={saveAllChanges}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存修改
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <X className="h-4 w-4" />
                  取消
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setNotice(null);
                }}
                className="flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
              >
                <Edit3 className="h-4 w-4" />
                编辑简历
              </button>
            )}

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              导出 PDF
            </button>
          </div>
        </div>

        {notice && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <div className="space-y-6">
          <div className="rounded-[32px] border border-slate-200 bg-[#F7F8FB] p-3 shadow-inner sm:p-4">
            <div className="mb-4 flex flex-col gap-4 px-2">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Resume Preview
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    简历会自动缩放完整展示，编辑时可直接在简历内修改内容和头像。
                  </div>
                </div>
                <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500">
                  A4
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {templateOptions.map((option) => {
                  const isActive = option.id === selectedTemplate;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedTemplate(option.id)}
                      className={`rounded-3xl border px-4 py-4 text-left transition ${
                        isActive
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div className="text-sm font-black text-slate-900">{option.label}</div>
                        {isActive && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                      </div>
                      <div className="text-sm leading-6 text-slate-500">{option.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              ref={previewViewportRef}
              className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-2 sm:p-4"
            >
              <div
                className="mx-auto"
                style={{
                  width: `${A4_PIXEL_WIDTH * previewScale}px`,
                  height: `${previewDocumentHeight * previewScale}px`,
                }}
              >
                <div
                  ref={previewDocumentRef}
                  className="shadow-[0_24px_60px_-24px_rgba(15,23,42,0.3)]"
                  style={{
                    width: `${A4_PIXEL_WIDTH}px`,
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <ResumeDocument
                    profile={profile}
                    experiences={editableExperiences}
                    skills={skills}
                    template={selectedTemplate}
                    isEditing={isEditing}
                    loadingId={loadingId}
                    isUploadingAvatar={isUploadingAvatar}
                    onProfileChange={handleProfileChange}
                    onExperienceChange={handleExperienceChange}
                    onAvatarUploadClick={triggerAvatarUpload}
                    onAIOptimizeExperience={handleAIFormatExperience}
                    onGenerateAdvantages={handleGenerateAdvantages}
                    onGeneratePlanning={handleGeneratePlanning}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileChange}
      />

      <div aria-hidden="true" className="fixed left-[-200vw] top-0 pointer-events-none">
        <div ref={exportSourceRef}>
          <ResumeDocument
            profile={profile}
            experiences={editableExperiences}
            skills={skills}
            template={selectedTemplate}
            isEditing={false}
          />
        </div>
      </div>
    </div>
  );
};
