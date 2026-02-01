
import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, Loader2, Cpu, FileCheck, FileText, Users, Trophy, Sparkles, MessageSquareText } from 'lucide-react';
import { Experience } from '../types';
import { extractInfoFromImage } from '../services/geminiService';
import { uploadAchievementImage } from '../services/storageService';
import { supabase } from '../lib/supabase';

interface UploadModuleProps {
  onAddExperience: (exp: Experience) => void;
}

export const UploadModule: React.FC<UploadModuleProps> = ({ onAddExperience }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<Experience> | null>(null);
  const [manualText, setManualText] = useState('');
  const [activeMode, setActiveMode] = useState<'upload' | 'text'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview('document_placeholder');
    }
    
    // 引导用户输入描述或尝试进行结构化（DeepSeek 模式下需文本辅助）
    setActiveMode('text');
  };

  const processManualText = async () => {
    if (!manualText.trim()) return;
    setIsProcessing(true);
    try {
      // 利用 DeepSeek 处理文本内容并结构化
      const data = await extractInfoFromImage(manualText);
      setExtractedData(data);
    } catch (error) {
      console.error(error);
      alert("DeepSeek 识别失败，请手动调整。");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData) return;
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未登录");
      
      let imageUrl = '';
      if (selectedFile && selectedFile.type.startsWith('image/')) {
          imageUrl = await uploadAchievementImage(selectedFile, user.id);
      }

      const newExp: Experience = {
        id: `exp-${Date.now()}`,
        title: extractedData.title || '新成果项目',
        organizer: extractedData.organizer || '未知机构',
        date: extractedData.date || new Date().toISOString().split('T')[0],
        role: extractedData.role || '主要参与人',
        description: extractedData.description || '',
        outcomes: extractedData.outcomes || [],
        category: extractedData.category || 'Project',
        tags: extractedData.tags || [],
        verified: true,
        image_url: imageUrl,
        team_size: extractedData.team_size || 1,
        rank: extractedData.rank || 1
      };
      onAddExperience(newExp);
      reset();
    } catch (error: any) {
      alert("同步失败: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setSelectedFile(null);
    setExtractedData(null);
    setManualText('');
    setActiveMode('upload');
  };

  const inputClass = "w-full px-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-slate-800 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 shadow-inner";

  return (
    <div className="space-y-10 animate-fade-in pb-16">
      <header>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">智能成果提取中心</h2>
        <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-[10px]">DeepSeek Achievement Sync & Recognition</p>
      </header>

      <div className="bg-white rounded-[48px] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">
        {activeMode === 'upload' && !preview ? (
          <div
            className={`flex-1 flex flex-col items-center justify-center p-20 text-center transition-all duration-300 group cursor-pointer ${
              isDragging ? 'bg-blue-50/50' : 'bg-white'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <div className="w-24 h-24 bg-blue-600 text-white rounded-[32px] flex items-center justify-center mb-8 shadow-2xl shadow-blue-100 group-hover:scale-105 group-hover:rotate-3 transition-transform">
              <Upload className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">上传成果原件</h3>
            <p className="text-slate-400 mt-3 font-bold uppercase tracking-widest text-[11px]">证书照片 / 获奖通知 / 项目文档</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row flex-1">
            <div className="lg:w-1/2 bg-slate-900 p-12 relative flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                {preview === 'document_placeholder' ? (
                  <div className="text-center text-slate-600">
                      <FileText size={120} className="mx-auto opacity-20 mb-6" />
                      <p className="font-black text-xs uppercase tracking-[0.3em]">{selectedFile?.name}</p>
                  </div>
                ) : preview ? (
                  <img src={preview} alt="Preview" className="max-w-full max-h-[400px] object-contain rounded-3xl shadow-2xl border-4 border-white/5" />
                ) : (
                  <div className="text-center opacity-20 text-white">
                      <MessageSquareText size={80} className="mx-auto mb-4" />
                      <p className="font-black uppercase tracking-widest text-xs">Waiting for Content</p>
                  </div>
                )}
              </div>
              <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 text-blue-400 mb-2">
                      <Sparkles size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">DeepSeek 文本分析助手</span>
                  </div>
                  <textarea 
                    placeholder="在此粘贴证书内容或描述成果详情（例如：获得第XX届电子大赛二等奖，团队共3人，排名第1...）"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    className="w-full bg-white/10 border border-white/10 rounded-2xl p-5 text-white font-medium text-sm h-32 outline-none focus:border-blue-500 transition-all placeholder:text-white/20"
                  />
                  <button 
                    onClick={processManualText}
                    disabled={isProcessing || !manualText.trim()}
                    className="w-full bg-white text-slate-900 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all disabled:opacity-30"
                  >
                    {isProcessing ? <Loader2 className="animate-spin mx-auto" /> : "智能解析内容"}
                  </button>
              </div>
              <button onClick={reset} className="absolute top-8 left-8 text-white/30 hover:text-white transition-colors"><Cpu size={20} /></button>
            </div>

            <div className="lg:w-1/2 p-14 flex flex-col">
              {extractedData ? (
                <div className="space-y-8 animate-fade-in flex-1">
                  <header>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <CheckCircle size={14} /> 结构化数据已生成
                    </span>
                    <h3 className="text-3xl font-black text-slate-900 mt-2">核对成果档案</h3>
                  </header>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">项目/奖项全称</label>
                        <input value={extractedData.title || ''} onChange={e => setExtractedData({...extractedData, title: e.target.value})} className={inputClass} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Users size={12}/> 团队规模</label>
                            <input type="number" value={extractedData.team_size || 1} onChange={e => setExtractedData({...extractedData, team_size: parseInt(e.target.value)})} className={inputClass} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Trophy size={12}/> 个人位次</label>
                            <input type="number" value={extractedData.rank || 1} onChange={e => setExtractedData({...extractedData, rank: parseInt(e.target.value)})} className={inputClass} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">核心工作描述</label>
                        <textarea value={extractedData.description || ''} onChange={e => setExtractedData({...extractedData, description: e.target.value})} className={`${inputClass} font-medium text-sm min-h-[120px] leading-relaxed py-5`} />
                    </div>
                  </div>

                  <button 
                    onClick={handleSave}
                    disabled={isProcessing}
                    className="w-full bg-slate-900 text-white py-6 rounded-[28px] font-black text-xs uppercase tracking-[0.3em] hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-4 active:scale-95 mt-4"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <FileCheck size={20} />}
                    确 认 并 同 步
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-10">
                  <Sparkles size={100} className="mb-6" />
                  <p className="font-black text-sm uppercase tracking-[0.5em]">Awaiting Analysis</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
