
import { Experience, Job, MatchResult, Skill } from "../types";

/**
 * 通用的 DeepSeek API 调用工具函数 (兼容 OpenAI 格式)
 */
const callDeepSeek = async (
  messages: { role: 'system' | 'user'; content: string }[],
  jsonMode: boolean = false
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("DeepSeek API Key is missing. Please ensure process.env.API_KEY is configured.");
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat', // 使用高效的 DeepSeek-V3 模型
      messages,
      response_format: jsonMode ? { type: 'json_object' } : undefined,
      temperature: 0.2, // 较低随机度以保证简历格式和数据一致性
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`DeepSeek API Error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

/**
 * 提炼核心竞争优势
 */
export const generateAdvantagesFromExperiences = async (experiences: Experience[]): Promise<string> => {
    const experiencesContext = experiences.map(e => `${e.title}(${e.role}): ${e.description}`).join('\n');
    const systemInstruction = `你是一位顶级简历猎头和职业规划专家。请根据用户提供的实战经历，提炼出 4 条“核心竞争优势”。
    
    要求：
    1. 每一条必须以 "• " 开头。
    2. 必须包含具体的量化数据（如提升%、节省时间、获得奖项位次等）。
    3. 每条不超过 25 个字。
    4. 严禁任何引导语，直接输出这 4 条列表。`;

    const prompt = `以下是我的实战经历：\n\n${experiencesContext}`;

    return await callDeepSeek([
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt }
    ]);
};

/**
 * 简历经历润色：极致 STAR 法则
 */
export const optimizeResumeEntry = async (text: string): Promise<string> => {
    const systemInstruction = `你是一个专业的简历优化专家。请将用户描述转化为精简且具备冲击力的 STAR 法则格式。
    
    格式规范：
    • Situation: [背景描述]
    • Task: [面临的任务]
    • Action: [采取的具体核心行动]
    • Result: [量化结果与成就]
    
    要求：每部分仅需一句话，禁止废话，突出动词，直接返回。`;

    return await callDeepSeek([
      { role: 'system', content: systemInstruction },
      { role: 'user', content: `请润色以下内容：\n\n${text}` }
    ]);
};

/**
 * 结构化文本提取 (DeepSeek 替代 Vision 方案)
 */
export const extractInfoFromImage = async (textContext: string): Promise<Partial<Experience>> => {
  const systemInstruction = `你是一个简历数据结构化专家。将提供的零散文本转换为简历项目 JSON。
  JSON 必须包含以下字段：
  - title (项目或奖项名称)
  - team_size (团队人数，数字)
  - rank (个人排名或位次，数字)
  - role (担任角色)
  - description (简短描述)
  - category (只能是 Competition/Project/Internship/Academic/Campus 之一)
  - date (YYYY-MM-DD 格式)`;

  try {
    const content = await callDeepSeek([
      { role: 'system', content: systemInstruction },
      { role: 'user', content: `请分析并结构化以下内容：\n\n${textContext}` }
    ], true);
    return JSON.parse(content);
  } catch (error) {
    console.error("Text Extraction Error:", error);
    return { title: "解析后的新成果", date: new Date().toISOString().split('T')[0] };
  }
};

/**
 * 分析成长轨迹
 */
export const generateGrowthSummary = async (experiences: Experience[]): Promise<{ trajectory?: string; strengths?: string; improvements?: string } | null> => {
    const experiencesContext = experiences.map(e => `${e.date}: ${e.title} (${e.role})`).join('\n');
    const systemInstruction = `你是一个资深学业规划顾问。请分析学生的成长轨迹，并以 JSON 格式返回以下字段：
    - trajectory: 对成长路径的专业评价
    - strengths: 目前展现出的核心优势
    - improvements: 建议加强的方向`;
    
    try {
        const content = await callDeepSeek([
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `分析以下成长轨迹：\n\n${experiencesContext}` }
        ], true);
        return JSON.parse(content);
    } catch (e) {
        return null;
    }
};

/**
 * 职业分身形象描述生成 (DeepSeek 目前无绘图，返回描述性 Prompt)
 */
export const generateCareerAvatar = async (skills: string[], major: string): Promise<string> => {
    // 由于 DeepSeek 不支持图像生成，这里返回一个代表性的 UI Avatars 链接，
    // 或建议用户结合 DALL-E/Midjourney 的描述词
    const nameStr = encodeURIComponent(`${major} Expert`);
    return `https://ui-avatars.com/api/?name=${nameStr}&background=0D8ABC&color=fff&size=512&bold=true`;
};

/**
 * 职位匹配分析
 */
export const matchJobToProfile = async (job: Job, experiences: Experience[], skills: Skill[]): Promise<MatchResult> => {
    const systemInstruction = `你是一个资深 HR。分析该职位与用户画像的匹配度，并输出 JSON。
    JSON 结构：
    {
      "score": 匹配度数字 0-100,
      "matchingSkills": ["匹配的技能1", ...],
      "missingSkills": ["缺失的关键能力1", ...],
      "advice": "简短的求职建议",
      "recommendations": [
        { "id": "1", "title": "推荐课程名", "platform": "Coursera/B站", "url": "#", "reason": "为什么推荐" }
      ]
    }`;

    const context = `职位：${job.title}, 经历：${experiences.map(e => e.title).join(',')}, 技能：${skills.map(s => s.name).join(',')}`;
    
    try {
        const content = await callDeepSeek([
          { role: 'system', content: systemInstruction },
          { role: 'user', content: context }
        ], true);
        return JSON.parse(content);
    } catch (error) {
        console.error("Job Match Error:", error);
        throw error;
    }
};
