export enum SkillLevel {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced',
}

export type Gender = '男' | '女' | '其他' | '';

export type ExperienceCategory =
  | 'Academic'
  | 'Competition'
  | 'Internship'
  | 'Project'
  | 'Campus';

export interface Skill {
  name: string;
  level: SkillLevel;
  score: number;
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  university: string;
  major: string;
  degree: string;
  gpa: string;
  courses: string;
  period: string;
  gender: Gender;
  grade: string;
  birthYear?: string;
  avatar_url?: string;
  ethnicity?: string;
  jobTarget?: string;
  personalAdvantages?: string;
  techPlanning?: string;
}

export interface Experience {
  id: string;
  user_id?: string;
  title: string;
  organizer: string;
  date: string;
  role: string;
  description: string;
  outcomes: string[];
  category: ExperienceCategory;
  tags: string[];
  verified: boolean;
  image_url?: string;
  team_size?: number;
  rank?: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  requirements: string[];
  description: string;
  type: 'Internship' | 'Full-time';
}

export interface CourseRecommendation {
  id: string;
  title: string;
  platform: string;
  url: string;
  reason: string;
}

export interface MatchResult {
  score: number;
  missingSkills: string[];
  matchingSkills: string[];
  advice: string;
  recommendations: CourseRecommendation[];
}
