
import React, { useState } from 'react';
import { Sparkles, ShieldCheck, Zap, Loader2, Camera, Download } from 'lucide-react';
import { generateCareerAvatar } from '../services/geminiService';

interface VisualPersonaProps {
  skills: { name: string }[];
  major: string;
}

// Fixed: Removed the local 'declare global' block for 'aistudio' to resolve TypeScript conflicts 
// with existing environment-provided 'AIStudio' type definitions. 
// We will access window.aistudio using a type assertion in the implementation.

export const VisualPersona: React.FC<VisualPersonaProps> = ({ skills, major }) => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Fixed: Access window.aistudio via casting to any to bypass declaration conflicts 
      // while ensuring the required methods are called as per Gemini API guidelines.
      const aistudio = (window as any).aistudio;
      const hasKey = await aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await aistudio.openSelectKey();
        // GUIDELINE: Assume selection was successful after triggering openSelectKey and proceed.
      }

      const skillList = skills.slice(0, 3).map(s => s.name);
      const imageUrl = await generateCareerAvatar(skillList, major);
      setAvatar(imageUrl);
    } catch (error: any) {
      // GUIDELINE: Handle "Requested entity was not found" by prompting for a key selection again.
      if (error.message?.includes("entity was not found")) {
        alert("密钥失效，请重新选择有权访问 Gemini 3 Pro 的 API 密钥");
        await (window as any).aistudio.openSelectKey();
      } else {
        alert("生成失败，请检查网络或密钥配额");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group border border-indigo-500/20 shadow-2xl">
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
        <Sparkles className="w-40 h-40 text-indigo-400 rotate-12" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold tracking-widest uppercase">
            <Zap className="w-3.5 h-3.5" /> 智能成就可视化
          </div>
          <h2 className="text-4xl font-black tracking-tight leading-tight">
            生成你的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">职场数字分身</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-md">
            基于你当前的专业能力档案，利用 AI 绘画引擎生成一个代表你未来职业形象的 3D 数字角色。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center justify-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              {avatar ? "重新塑造形象" : "立即生成分身"}
            </button>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-green-500" /> 需绑定支付 API Key
            </div>
          </div>
        </div>

        <div className="w-full md:w-64 h-64 bg-slate-800 rounded-[2rem] border-4 border-slate-700/50 flex items-center justify-center relative overflow-hidden shadow-inner">
          {avatar ? (
            <>
              <img src={avatar} alt="AI Career Avatar" className="w-full h-full object-cover animate-fade-in" />
              <button 
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = avatar;
                  a.download = 'career-avatar.png';
                  a.click();
                }}
                className="absolute bottom-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-lg hover:bg-white/40 text-white transition-all"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="text-center p-6">
              <Sparkles className={`w-12 h-12 mx-auto mb-4 text-slate-600 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                {loading ? "正在构思..." : "形象待生成"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
