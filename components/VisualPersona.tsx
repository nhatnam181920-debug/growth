import React, { useState } from 'react';
import { Camera, Download, Loader2, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { generateCareerAvatar } from '../services/aiService';

interface VisualPersonaProps {
  skills: { name: string }[];
  major: string;
}

export const VisualPersona: React.FC<VisualPersonaProps> = ({ skills, major }) => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const imageUrl = await generateCareerAvatar(
        skills.slice(0, 3).map((skill) => skill.name),
        major || '大学生',
      );
      setAvatar(imageUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成失败，请稍后重试。';
      window.alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-[40px] border border-indigo-500/20 bg-slate-900 p-8 text-white shadow-2xl">
      <div className="absolute right-0 top-0 p-8 opacity-10 transition-opacity group-hover:opacity-20">
        <Sparkles className="h-40 w-40 rotate-12 text-indigo-400" />
      </div>

      <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-400">
            <Zap className="h-4 w-4" />
            智能职业形象
          </div>

          <div>
            <h2 className="text-3xl font-black leading-tight sm:text-4xl">
              生成你的数字职业分身
            </h2>
            <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-slate-400">
              根据当前专业和技能标签，快速生成一张用于展示的职业形象图。当前默认接入 DeepSeek 文本能力，图像生成功能需额外图片模型支持。
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-3 rounded-[22px] bg-white px-8 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-900 transition-all hover:bg-indigo-50 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              {avatar ? '重新生成' : '立即生成'}
            </button>

            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              需要额外的图片模型配置
            </div>
          </div>
        </div>

        <div className="relative flex h-64 w-full max-w-xs items-center justify-center overflow-hidden rounded-[32px] border-4 border-slate-700/50 bg-slate-800 shadow-inner">
          {avatar ? (
            <>
              <img src={avatar} alt="Career avatar" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  const anchor = document.createElement('a');
                  anchor.href = avatar;
                  anchor.download = 'career-avatar.png';
                  anchor.click();
                }}
                className="absolute bottom-4 right-4 rounded-xl bg-white/20 p-2 text-white backdrop-blur-md transition-all hover:bg-white/35"
              >
                <Download className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="px-6 text-center">
              <Sparkles
                className={`mx-auto mb-4 h-12 w-12 ${
                  loading ? 'animate-spin text-indigo-400' : 'text-slate-600'
                }`}
              />
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                {loading ? '正在生成形象...' : '等待生成'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
