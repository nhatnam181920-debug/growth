import { Experience, Job, Skill, SkillLevel, UserProfile } from './types';

export const DEMO_PROFILE: UserProfile = {
  name: '演示同学',
  university: '上海理工大学',
  major: '计算机科学与技术',
  gender: '男',
  grade: '大三',
  email: 'demo@qing.site',
  phone: '13800000000',
  location: '上海',
  linkedin: '',
  degree: '本科',
  gpa: '3.9/4.0',
  courses: '数据结构、算法设计、数据库系统、操作系统',
  period: '2022 - 2026',
  birthYear: '2004.09',
  ethnicity: '汉族',
  jobTarget: '产品 / 运营 / 数据分析实习',
  personalAdvantages:
    '具备扎实的前端开发基础，能够独立完成从需求梳理到页面交付的完整流程；在竞赛与项目实践中持续积累团队协作、问题拆解和快速交付能力。',
  techPlanning:
    '短期聚焦 React、TypeScript、Supabase 与 AI 应用开发，补齐工程化与移动端适配能力；中期目标是形成可展示的实习项目组合，并进一步沉淀个性化实习履历。',
};

export const MOCK_JOBS: Job[] = [
  {
    id: 'job-1',
    title: '前端开发实习生',
    company: '智流科技',
    location: '上海 / 远程',
    salary: '200-300/天',
    type: 'Internship',
    requirements: ['React', 'TypeScript', 'Tailwind CSS', 'Git'],
    description:
      '参与学生成长产品的 Web 前端开发，负责页面迭代、组件封装和移动端适配，配合产品与后端完成功能上线。',
  },
  {
    id: 'job-2',
    title: '数据分析实习生',
    company: '数域集团',
    location: '上海',
    salary: '250-400/天',
    type: 'Internship',
    requirements: ['Python', 'SQL', '数据可视化', '沟通表达'],
    description:
      '协助完成业务数据清洗、指标监控与专题分析，输出可落地的结论并沉淀日报、周报和复盘材料。',
  },
  {
    id: 'job-3',
    title: '产品经理助理（日常实习）',
    company: '创新 X',
    location: '北京',
    salary: '280-450/天',
    type: 'Internship',
    requirements: ['需求分析', '用户调研', '原型设计', '跨团队协作'],
    description:
      '支持校园方向产品从需求梳理到上线验证的全流程，适合每周稳定到岗 3 天以上的日常实习同学。',
  },
  {
    id: 'job-4',
    title: '后端开发实习生',
    company: '云端科技',
    location: '深圳',
    salary: '300-500/天',
    type: 'Internship',
    requirements: ['Node.js', 'Redis', 'Docker', 'SQL'],
    description:
      '参与核心业务接口开发与性能优化，配合前端与测试完成联调，推动服务稳定性与可维护性提升。',
  },
  {
    id: 'job-5',
    title: 'AI 应用开发实习生',
    company: '智跃 AI',
    location: '北京 / 远程',
    salary: '400-650/天',
    type: 'Internship',
    requirements: ['Prompt 设计', 'Python', '大模型应用', '产品理解'],
    description:
      '围绕大模型能力完成 AI Agent、信息抽取与推荐应用开发，关注用户体验、稳定性和业务可用性。',
  },
  {
    id: 'job-6',
    title: 'UI/UX 设计实习生',
    company: '木星互动',
    location: '杭州',
    salary: '220-350/天',
    type: 'Internship',
    requirements: ['Figma', '交互设计', '设计系统', '用户体验'],
    description:
      '参与产品界面与交互优化，补齐设计规范并落地移动端、桌面端适配，提升整体体验一致性。',
  },
  {
    id: 'job-7',
    title: '短期项目助理（2-4 周）',
    company: '青桥项目组',
    location: '远程',
    salary: '150-220/天',
    type: 'Internship',
    requirements: ['资料整理', 'PPT', '执行推进', '沟通协调'],
    description:
      '面向短期项目冲刺周期，协助完成材料整理、用户访谈纪要、进度同步与交付收尾，适合快速积累项目经历。',
  },
  {
    id: 'job-8',
    title: '日常运营实习生（每周 3 天）',
    company: '青橙教育',
    location: '上海 / 混合办公',
    salary: '180-260/天',
    type: 'Internship',
    requirements: ['Excel', '内容运营', '社群维护', '数据复盘'],
    description:
      '负责活动排期、内容发布、社群反馈收集与基础数据复盘，适合稳定积累长期实习履历的同学。',
  },
  {
    id: 'job-9',
    title: '暑期产品实习生（2026 暑期）',
    company: '新岸科技',
    location: '北京',
    salary: '300-450/天',
    type: 'Internship',
    requirements: ['竞品分析', 'PRD', '用户洞察', '跨团队协作'],
    description:
      '面向暑期集中实习，参与产品方案设计、需求拆解、版本跟进与上线复盘，适合秋招前补强项目经历。',
  },
];

export const INITIAL_SKILLS: Skill[] = [
  { name: '编程开发', level: SkillLevel.Intermediate, score: 72 },
  { name: '团队协作', level: SkillLevel.Intermediate, score: 78 },
  { name: '沟通表达', level: SkillLevel.Intermediate, score: 68 },
  { name: '项目执行', level: SkillLevel.Intermediate, score: 74 },
  { name: '数据分析', level: SkillLevel.Beginner, score: 55 },
  { name: '产品思维', level: SkillLevel.Beginner, score: 60 },
];

export const INITIAL_EXPERIENCES: Experience[] = [
  {
    id: 'exp-demo-1',
    user_id: 'demo-user-id',
    title: '校园黑客马拉松二等奖',
    organizer: '计算机学院',
    date: '2024-10-15',
    role: '前端负责人',
    description:
      '在 48 小时黑客马拉松中负责前端交互与数据可视化模块设计，推动团队完成从需求拆解、原型验证到 Demo 展示的完整交付。',
    outcomes: ['完成 1 套可运行原型', '与 4 人团队协作完成答辩 Demo'],
    category: 'Competition',
    tags: ['React', '团队协作', '快速交付'],
    verified: true,
    rank: 2,
    team_size: 4,
  },
  {
    id: 'exp-demo-2',
    user_id: 'demo-user-id',
    title: '学生成长助手项目',
    organizer: '课程实践项目',
    date: '2025-04-20',
    role: '全栈开发',
    description:
      '基于 React 与 Supabase 搭建学生成长档案平台，实现成果上传、个性化实习履历生成和精准实习匹配等核心功能，并完成移动端适配。',
    outcomes: ['完成 Supabase 数据接入', '支持桌面端与手机端响应式布局'],
    category: 'Project',
    tags: ['React', 'Supabase', '响应式设计'],
    verified: false,
    team_size: 2,
  },
];
