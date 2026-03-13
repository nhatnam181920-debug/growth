import { CourseRecommendation, Experience, Job, MatchResult, Skill } from '../types';

type ResumeContext = {
  title?: string;
  role?: string;
};

type GrowthSummary = {
  trajectory: string;
  strengths: string;
  improvements: string;
};

type ChatOptions = {
  system: string;
  user: string;
  responseFormat?: 'text' | 'json';
  temperature?: number;
  maxTokens?: number;
};

type OcrOptions = {
  base64Data: string;
  mimeType: string;
  pageNo?: number;
};

const MAX_EXTRACTION_SOURCE_LENGTH = 6000;

const cleanText = (value: string) =>
  value.replace(/^[\s"'`]+|[\s"'`]+$/g, '').trim();

const today = () => new Date().toISOString().split('T')[0];

const extractJsonObject = (value: string) => {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] || value).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    throw new Error('AI 未返回有效的 JSON 结构。');
  }

  return candidate.slice(start, end + 1);
};

const requestDeepSeek = async ({
  system,
  user,
  responseFormat = 'text',
  temperature = 0.3,
  maxTokens = 1200,
}: ChatOptions) => {
  const response = await fetch('/api/deepseek/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      system,
      user,
      responseFormat,
      temperature,
      maxTokens,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { content?: string; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || 'DeepSeek 请求失败，请检查本地服务或环境变量配置。');
  }

  return typeof payload?.content === 'string' ? payload.content.trim() : '';
};

const requestAliyunOcr = async ({ base64Data, mimeType, pageNo = 1 }: OcrOptions) => {
  const response = await fetch('/api/aliyun/ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base64Data,
      mimeType,
      pageNo,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { content?: string; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || '阿里云 OCR 请求失败，请检查本地服务或环境变量配置。');
  }

  return typeof payload?.content === 'string' ? payload.content.trim() : '';
};

const combineExtractionSources = (ocrText: string, manualText: string) =>
  [
    ocrText ? `OCR 识别文本：\n${ocrText}` : '',
    manualText ? `用户补充说明：\n${manualText}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

const trimExtractionSource = (value: string) =>
  value.length > MAX_EXTRACTION_SOURCE_LENGTH
    ? `${value.slice(0, MAX_EXTRACTION_SOURCE_LENGTH)}\n\n[文本过长，已截断后用于结构化整理]`
    : value;

const buildFallbackExtraction = (textPrompt?: string): Partial<Experience> => {
  const normalized = cleanText(textPrompt || '');
  const shortTitle = normalized ? normalized.slice(0, 18) : '未命名成果';

  return {
    title: shortTitle,
    organizer: '待补充',
    role: '参与成员',
    description: normalized || '请补充该成果的背景、行动和结果。',
    category: 'Project',
    date: today(),
  };
};

const buildFallbackSummary = (experiences: Experience[]): GrowthSummary => {
  if (experiences.length === 0) {
    return {
      trajectory: '当前还没有录入成果，建议先补充竞赛、项目或实习经历。',
      strengths: '基础档案已经建立，可以从课程项目、校园活动或短期实践开始沉淀成果。',
      improvements: '优先补齐 1 到 2 段可量化经历，并为每段经历补充结果数据。',
    };
  }

  const latest = [...experiences].sort((a, b) => b.date.localeCompare(a.date))[0];

  return {
    trajectory: `你最近的代表性经历是“${latest.title}”，成长路径正在从单点尝试逐步走向项目化实践。`,
    strengths: '执行力较强，能够围绕目标持续交付，并开始形成结构化表达能力。',
    improvements: '建议继续补充量化结果、团队角色与关键动作，增强简历说服力。',
  };
};

const recommendationCatalog: Record<string, CourseRecommendation> = {
  React: {
    id: 'rec-react',
    title: 'React 实战进阶',
    platform: '中国大学 MOOC',
    url: 'https://www.icourse163.org/',
    reason: '补齐组件化开发与状态管理基础。',
  },
  TypeScript: {
    id: 'rec-ts',
    title: 'TypeScript 工程实践',
    platform: 'Coursera',
    url: 'https://www.coursera.org/',
    reason: '提升类型设计和大型前端项目维护能力。',
  },
  SQL: {
    id: 'rec-sql',
    title: 'SQL 数据分析基础',
    platform: '中国大学 MOOC',
    url: 'https://www.icourse163.org/',
    reason: '适合补齐数据查询与结构化分析能力。',
  },
  Python: {
    id: 'rec-python',
    title: 'Python 数据处理入门',
    platform: 'Coursera',
    url: 'https://www.coursera.org/',
    reason: '有助于快速完成清洗、分析与自动化任务。',
  },
  Figma: {
    id: 'rec-figma',
    title: 'Figma 界面设计工作流',
    platform: '网易云课堂',
    url: 'https://study.163.com/',
    reason: '适合提升设计协作与原型交付效率。',
  },
  default: {
    id: 'rec-default',
    title: '大学生职业竞争力提升课',
    platform: '中国大学 MOOC',
    url: 'https://www.icourse163.org/',
    reason: '帮助补齐通用表达、协作和项目呈现能力。',
  },
};

const buildFallbackMatch = (job: Job, experiences: Experience[], skills: Skill[]): MatchResult => {
  const normalizedSkills = skills.map((skill) => skill.name.toLowerCase());
  const matchingSkills = job.requirements.filter((requirement) =>
    normalizedSkills.some((skill) => skill.includes(requirement.toLowerCase())),
  );
  const missingSkills = job.requirements.filter((item) => !matchingSkills.includes(item));

  const experienceBonus = Math.min(experiences.length * 6, 24);
  const skillScore = job.requirements.length
    ? Math.round((matchingSkills.length / job.requirements.length) * 76)
    : 60;
  const score = Math.max(35, Math.min(96, skillScore + experienceBonus));

  const recommendations = missingSkills.slice(0, 3).map((skillName) => {
    const recommendation =
      recommendationCatalog[skillName] ||
      recommendationCatalog[skillName.split(' ')[0]] ||
      recommendationCatalog.default;

    return { ...recommendation, id: `${recommendation.id}-${skillName}` };
  });

  return {
    score,
    matchingSkills,
    missingSkills,
    advice:
      missingSkills.length === 0
        ? '你的经历与岗位要求比较贴合，可以重点强化项目结果与量化成果后再投递。'
        : `建议优先补齐 ${missingSkills.slice(0, 2).join('、')}，并在简历中强调最相关的项目场景。`,
    recommendations,
  };
};

export const extractInfoFromMedia = async (
  base64Data?: string,
  mimeType?: string,
  textPrompt?: string,
): Promise<Partial<Experience>> => {
  const normalizedManualText = cleanText(textPrompt || '');
  let ocrText = '';
  let ocrError: Error | null = null;

  if (base64Data && mimeType) {
    try {
      ocrText = cleanText(
        await requestAliyunOcr({
          base64Data,
          mimeType,
        }),
      );
    } catch (error) {
      ocrError =
        error instanceof Error ? error : new Error('阿里云 OCR 调用失败，请稍后重试。');
      console.warn('Aliyun OCR extraction failed:', ocrError);
    }
  }

  const extractionSource = trimExtractionSource(
    combineExtractionSources(ocrText, normalizedManualText),
  );

  if (!extractionSource) {
    if (ocrError) {
      throw ocrError;
    }

    if (base64Data && mimeType) {
      throw new Error('未能从文件中识别到可用文字，请更换更清晰的图片或补充文字说明。');
    }

    return buildFallbackExtraction(textPrompt);
  }

  try {
    const content = await requestDeepSeek({
      system:
        '你是大学生成果档案结构化助手。请严格输出 JSON，不要输出解释。字段必须包含 title、organizer、role、description、category、date，可选包含 team_size、rank。',
      user: `请根据以下内容提取信息，并返回 JSON。\n\n${extractionSource}`,
      responseFormat: 'json',
      temperature: 0.2,
      maxTokens: 800,
    });

    return JSON.parse(extractJsonObject(content)) as Partial<Experience>;
  } catch (error) {
    console.warn('DeepSeek extraction failed, using fallback parser:', error);
    return buildFallbackExtraction(extractionSource);
  }
};

export const optimizeResumeEntry = async (
  text: string,
  context?: ResumeContext,
): Promise<string> => {
  const normalized = cleanText(text);
  if (!normalized) {
    return text;
  }

  try {
    const contextBlock = [
      context?.title ? `经历标题：${context.title}` : '',
      context?.role ? `担任角色：${context.role}` : '',
      `原始描述：${normalized}`,
    ]
      .filter(Boolean)
      .join('\n');

    const content = await requestDeepSeek({
      system:
        '你是中文简历优化助手。请把用户经历改写成适合投递实习岗位的单段 STAR 表达。禁止输出解释、标题、序号、引号和 Markdown。',
      user: contextBlock,
      responseFormat: 'text',
      temperature: 0.4,
      maxTokens: 500,
    });

    return cleanText(content || normalized) || normalized;
  } catch (error) {
    console.warn('DeepSeek resume optimization failed:', error);
    return normalized;
  }
};

export const generateAdvantagesFromExperiences = async (
  experiences: Experience[],
): Promise<string> => {
  if (experiences.length === 0) {
    return '建议先补充至少 1 段项目、竞赛或实习经历，再生成核心竞争优势。';
  }

  const fallback = experiences
    .slice(0, 3)
    .map(
      (experience, index) =>
        `${index + 1}. 围绕“${experience.title}”沉淀了可展示的执行成果与角色责任。`,
    )
    .join('\n');

  try {
    const context = experiences
      .slice(0, 5)
      .map((experience) => `${experience.title}（${experience.role}）：${experience.description}`)
      .join('\n');

    const content = await requestDeepSeek({
      system:
        '你是中文求职辅导助手。请基于用户经历提炼 4 条核心竞争优势，每条单独一行，突出行动、结果和岗位适配度，不要输出序言。',
      user: context,
      responseFormat: 'text',
      temperature: 0.5,
      maxTokens: 700,
    });

    return cleanText(content || fallback) || fallback;
  } catch (error) {
    console.warn('DeepSeek advantages generation failed:', error);
    return fallback;
  }
};

export const generateCareerAvatar = async (_skills: string[], _major: string): Promise<string> => {
  throw new Error('当前已接入 DeepSeek 文本能力，职业形象图生成暂未接入图片模型。');
};

export const matchJobToProfile = async (
  job: Job,
  experiences: Experience[],
  skills: Skill[],
): Promise<MatchResult> => {
  const fallback = buildFallbackMatch(job, experiences, skills);

  try {
    const context = [
      `岗位标题：${job.title}`,
      `岗位描述：${job.description}`,
      `岗位要求：${job.requirements.join('、')}`,
      `候选人技能：${skills.map((skill) => skill.name).join('、')}`,
      `候选人经历：${experiences
        .map((experience) => `${experience.title}（${experience.role}）`)
        .join('；')}`,
    ].join('\n');

    const content = await requestDeepSeek({
      system:
        '你是实习岗位匹配分析助手。请严格输出 JSON，字段包含 score、matchingSkills、missingSkills、advice、recommendations。recommendations 必须是数组，每项包含 id、title、platform、url、reason。',
      user: context,
      responseFormat: 'json',
      temperature: 0.2,
      maxTokens: 1200,
    });

    const parsed = JSON.parse(extractJsonObject(content)) as MatchResult;
    return {
      ...fallback,
      ...parsed,
      recommendations:
        parsed.recommendations?.length > 0 ? parsed.recommendations : fallback.recommendations,
    };
  } catch (error) {
    console.warn('DeepSeek job matching failed:', error);
    return fallback;
  }
};

export const generateGrowthSummary = async (
  experiences: Experience[],
): Promise<GrowthSummary> => {
  const fallback = buildFallbackSummary(experiences);

  try {
    const context = experiences
      .map((experience) => `${experience.date} ${experience.title}：${experience.description}`)
      .join('\n');

    const content = await requestDeepSeek({
      system:
        '你是大学生成长分析助手。请严格输出 JSON，字段包含 trajectory、strengths、improvements，内容必须是简洁中文。',
      user: context || '当前还没有任何经历，请给出简洁建议。',
      responseFormat: 'json',
      temperature: 0.3,
      maxTokens: 700,
    });

    const parsed = JSON.parse(extractJsonObject(content)) as GrowthSummary;
    return {
      trajectory: parsed.trajectory || fallback.trajectory,
      strengths: parsed.strengths || fallback.strengths,
      improvements: parsed.improvements || fallback.improvements,
    };
  } catch (error) {
    console.warn('DeepSeek growth summary failed:', error);
    return fallback;
  }
};
