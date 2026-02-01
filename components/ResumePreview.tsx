
import React, { useRef, useState, useEffect } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { Experience, Skill, UserProfile } from '../types';
import { Wand2, Edit3, Loader2, SaveAll, Sparkles, Trophy, Phone, Mail, MapPin, Download, FileText } from 'lucide-react';
import { optimizeResumeEntry, generateAdvantagesFromExperiences } from '../services/geminiService';

interface ResumePreviewProps {
  experiences: Experience[];
  skills: Skill[];
  userProfile: UserProfile;
  onProfileUpdate?: (profile: UserProfile) => void;
}

export const ResumePreview: React.FC<ResumePreviewProps> = ({ experiences, skills, userProfile, onProfileUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const [profile, setProfile] = useState<UserProfile>(userProfile);
  const [editableExperiences, setEditableExperiences] = useState<Experience[]>(experiences);

  useEffect(() => {
    if (!isEditing) {
      setProfile(userProfile);
      setEditableExperiences(experiences);
    }
  }, [userProfile, experiences, isEditing]);

  const handleExportPDF = async () => {
    const element = document.getElementById('resume-canvas');
    if (!element || isExporting) return;
    
    setIsExporting(true);
    
    // 使用 html2pdf 配置
    const opt = {
      margin: [0, 0, 0, 0],
      filename: `${profile.name || 'Resume'}_UniPath_Career_Sheet.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        logging: false
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF Export Error:", err);
      // 备选方案：触发浏览器打印
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handleAIFormat = async (target: string) => {
    setLoadingId(target);
    try {
        if (target === 'advantages') {
            const res = await generateAdvantagesFromExperiences(experiences);
            setProfile(p => ({ ...p, personalAdvantages: res }));
            if (onProfileUpdate) onProfileUpdate({ ...profile, personalAdvantages: res });
        } else {
            const exp = editableExperiences.find(e => e.id === target);
            if (exp) {
                const optimized = await optimizeResumeEntry(exp.description);
                setEditableExperiences(prev => prev.map(e => e.id === target ? { ...e, description: optimized } : e));
            }
        }
    } catch (e) { 
        alert("DeepSeek AI 响应失败，请检查 API 配置或网络。"); 
    } finally { 
        setLoadingId(null); 
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-10 bg-[#F5F5F7] min-h-screen p-4 lg:p-0">
        {/* 左侧控制台 */}
        <div className="lg:w-80 space-y-6 no-print">
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
                <h3 className="font-black text-xs mb-8 flex items-center gap-2 uppercase tracking-widest text-gray-400">
                  <FileText size={14} className="text-[#800000]" /> Resume Console
                </h3>
                <div className="space-y-3">
                    <button 
                        onClick={() => setIsEditing(!isEditing)} 
                        className={`w-full py-4 rounded-2xl font-black text-xs shadow-xl flex items-center justify-center gap-2 transition-all ${
                            isEditing ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                    >
                        {isEditing ? <SaveAll size={16} /> : <Edit3 size={16} />}
                        {isEditing ? "退出预览模式" : "进入实时编辑"}
                    </button>
                    
                    <button 
                        onClick={handleExportPDF} 
                        disabled={isExporting}
                        className="w-full py-4 bg-[#800000] text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-red-100 disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} 
                        导出 A4 PDF 文档
                    </button>
                </div>
            </div>
            
            <div className="bg-white p-8 rounded-[32px] border border-gray-100">
                <h4 className="font-black text-[10px] text-gray-400 uppercase tracking-widest mb-6">当前能力分布预览</h4>
                <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={skills}>
                            <PolarGrid stroke="#f1f5f9" />
                            <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 900 }} />
                            <Radar dataKey="score" stroke="#800000" fill="#800000" fillOpacity={0.1} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* 右侧简历画布 (A4 标准) */}
        <div className="flex-1 flex justify-center py-4 print:p-0">
            <div 
                id="resume-canvas"
                className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-[22mm_24mm] text-[#1D1D1F] flex flex-col box-border border-t-[12px] border-[#800000]"
                style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
            >
                <header className="flex justify-between items-start mb-14 pb-12 border-b border-gray-100">
                    <div className="flex-1">
                        <h1 className="text-6xl font-black text-black mb-5 tracking-tighter uppercase">{profile.name || "姓名"}</h1>
                        <p className="text-xl font-bold text-[#800000] mb-4">
                            {profile.university} · {profile.major}
                        </p>
                        <div className="grid grid-cols-2 gap-y-2 text-[13px] text-gray-500 font-bold">
                            <span className="flex items-center gap-2"><Phone size={12} className="text-gray-300"/> {profile.phone || "未填写手机"}</span>
                            <span className="flex items-center gap-2"><Mail size={12} className="text-gray-300"/> {profile.email || "未填写邮箱"}</span>
                            <span className="flex items-center gap-2"><MapPin size={12} className="text-gray-300"/> {profile.location || "待完善"}</span>
                            <span className="flex items-center gap-2 underline decoration-gray-200 decoration-2">GPA: {profile.gpa || "3.5+"}</span>
                        </div>
                    </div>
                    <div className="w-32 h-32 bg-gray-50 rounded-3xl p-3 border border-gray-100 shrink-0 shadow-inner">
                         <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={skills}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="name" tick={{ fontSize: 6, fontWeight: 900 }} />
                                <Radar dataKey="score" stroke="#800000" fill="#800000" fillOpacity={0.08} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </header>

                <div className="space-y-12 flex-1">
                    <section>
                        <div className="bg-[#800000] text-white px-7 py-3 font-black mb-8 flex justify-between items-center rounded-sm">
                            <span className="text-sm tracking-[0.2em] uppercase">核心竞争优势 CORE COMPETENCIES</span>
                            {isEditing && (
                                <button onClick={() => handleAIFormat('advantages')} className="text-[10px] bg-white/20 px-4 py-1.5 rounded-full flex items-center gap-2 border border-white/20 hover:bg-white/30 transition-all">
                                    {loadingId === 'advantages' ? <Loader2 className="animate-spin w-3 h-3" /> : <Sparkles size={12}/>} DeepSeek 深度提炼
                                </button>
                            )}
                        </div>
                        <div className="text-[14px] leading-relaxed text-gray-700 font-medium pl-2 whitespace-pre-line border-l-2 border-red-50 ml-2">
                            {profile.personalAdvantages || "点击‘编辑模式’，使用 AI 分析您的实战经历并一键生成该模块。"}
                        </div>
                    </section>

                    <section>
                        <div className="bg-[#800000] text-white px-7 py-3 font-black mb-10 rounded-sm">
                            <span className="text-sm tracking-[0.2em] uppercase">实战与科研经历 PROFESSIONAL EXPERIENCE</span>
                        </div>
                        <div className="space-y-12">
                            {editableExperiences.map(exp => (
                                <div key={exp.id} className="relative pl-10 ml-2 border-l border-gray-100">
                                    {/* 装饰圆点 */}
                                    <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#800000]"></div>
                                    
                                    <div className="flex justify-between items-baseline mb-3">
                                        <h4 className="text-xl font-black text-black">{exp.title}</h4>
                                        <span className="text-[11px] font-black text-gray-400 tracking-widest">{exp.date}</span>
                                    </div>
                                    <div className="flex items-center gap-4 mb-5">
                                        <span className="bg-gray-50 text-gray-500 px-3 py-1 rounded text-[10px] font-black border border-gray-100 uppercase tracking-widest">{exp.role}</span>
                                        {isEditing && (
                                            <button onClick={() => handleAIFormat(exp.id)} className="text-[10px] text-[#800000] font-black underline hover:text-red-700 transition-colors">
                                                {loadingId === exp.id ? "DeepSeek 润色中..." : "STAR 法则一键润色"}
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-[13.5px] text-gray-700 leading-relaxed font-medium whitespace-pre-line pl-1">
                                        {exp.description}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <footer className="mt-20 pt-10 border-t border-gray-50 flex justify-between items-center opacity-40">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black tracking-[0.4em] uppercase">UniPath AI Student OS</span>
                        <span className="text-[8px] font-bold text-gray-400 mt-1 italic">Generated via Professional Evaluation Intelligence</span>
                    </div>
                    <span className="text-[9px] font-black tracking-widest">A4 PAGE 01</span>
                </footer>
            </div>
        </div>
    </div>
  );
};
