import { Job, Experience, Skill, SkillLevel } from './types';

export const MOCK_JOBS: Job[] = [
  {
    id: '1',
    title: '前端开发实习生',
    company: '智流科技',
    location: '远程',
    salary: '200-300/天',
    type: 'Internship',
    requirements: ['React', 'TypeScript', 'Tailwind CSS', 'Git'],
    description: '加入我们充满活力的团队，构建现代 Web 应用。你将与高级工程师紧密合作，交付高质量代码，参与从设计到部署的全流程开发。'
  },
  {
    id: '2',
    title: '数据分析管培生',
    company: '数域集团',
    location: '上海',
    salary: '250-400/天',
    type: 'Internship',
    requirements: ['Python', 'SQL', '数据可视化', '沟通能力'],
    description: '分析海量数据集以得出可执行的商业洞察。具备 Pandas 和 Matplotlib 经验者优先。你将负责维护数据管道并生成业务报告。'
  },
  {
    id: '3',
    title: '产品经理助理',
    company: '创新X',
    location: '北京',
    salary: '12k-18k/月',
    type: 'Full-time',
    requirements: ['产品策略', '用户调研', '原型设计', '敏捷开发'],
    description: '从概念到发布，全权负责产品生命周期。与跨职能团队合作定义产品愿景，进行市场分析并规划产品路线图。'
  }
];

export const INITIAL_SKILLS: Skill[] = [
  { name: '编程开发', level: SkillLevel.Beginner, score: 30 },
  { name: '团队协作', level: SkillLevel.Intermediate, score: 60 },
  { name: '沟通表达', level: SkillLevel.Intermediate, score: 50 },
  { name: '问题解决', level: SkillLevel.Beginner, score: 40 },
  { name: '领导力', level: SkillLevel.Beginner, score: 20 },
  { name: '数据分析', level: SkillLevel.Beginner, score: 10 },
];

export const INITIAL_EXPERIENCES: Experience[] = [
  {
    id: 'exp-init-1',
    title: '校园黑客马拉松参赛者',
    organizer: '计算机科学学院',
    date: '2023-10-15',
    role: '团队成员',
    description: '参加了为期48小时的编程黑客马拉松，开发了一款可持续发展主题的小程序。',
    outcomes: ['使用 React 构建了产品原型', '与3名同学高效协作完成项目'],
    category: 'Competition',
    tags: ['团队协作', '编程开发'],
    verified: true
  }
];