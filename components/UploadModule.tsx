import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Cpu,
  FileCheck,
  FileText,
  Loader2,
  Sparkles,
  Trophy,
  Upload,
  Users,
} from 'lucide-react';
import { Experience } from '../types';
import { extractInfoFromMedia } from '../services/aiService';
import { uploadAchievementImage } from '../services/storageService';
import { supabase } from '../lib/supabase';

interface UploadModuleProps {
  onAddExperience: (experience: Experience) => void;
}

type Feedback = {
  type: 'success' | 'error' | 'info';
  message: string;
} | null;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

const CATEGORY_OPTIONS: Array<{
  value: Experience['category'];
  label: string;
}> = [
  { value: 'Competition', label: '竞赛奖项' },
  { value: 'Project', label: '项目实践' },
  { value: 'Internship', label: '实习经历' },
  { value: 'Academic', label: '学术成果' },
  { value: 'Campus', label: '校园活动' },
];

const normalizeCategory = (value?: string): Experience['category'] => {
  const matched = CATEGORY_OPTIONS.find((item) => item.value === value);
  return matched?.value || 'Project';
};

const today = () => new Date().toISOString().split('T')[0];

export const UploadModule: React.FC<UploadModuleProps> = ({ onAddExperience }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [extractedData, setExtractedData] = useState<Partial<Experience> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });

  const resetSelection = () => {
    setPreview(null);
    setSelectedFile(null);
    setExtractedData(null);
    setFeedback(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateFile = (file: File) => {
    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      return '仅支持 JPG、PNG、WebP 和 PDF 文件。';
    }

    if (file.size > MAX_FILE_SIZE) {
      return '文件大小不能超过 10MB。';
    }

    return null;
  };

  const handleFile = (file: File) => {
    const validationMessage = validateFile(file);
    if (validationMessage) {
      setFeedback({ type: 'error', message: validationMessage });
      return;
    }

    setFeedback(null);
    setExtractedData(null);
    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => setPreview(event.target?.result as string);
      reader.readAsDataURL(file);
      return;
    }

    setPreview('document_placeholder');
  };

  const processWithAI = async () => {
    if (!selectedFile && !manualText.trim()) {
      setFeedback({ type: 'error', message: '请先上传文件，或直接粘贴成果描述。' });
      return;
    }

    setIsProcessing(true);
    setFeedback({ type: 'info', message: '正在执行 OCR 识别与 AI 整理，请稍候...' });

    try {
      let base64Data: string | undefined;
      let mimeType: string | undefined;

      if (selectedFile) {
        base64Data = await fileToBase64(selectedFile);
        mimeType = selectedFile.type || 'application/octet-stream';
      }

      const result = await extractInfoFromMedia(base64Data, mimeType, manualText.trim());

      setExtractedData({
        title: result.title || selectedFile?.name.replace(/\.[^.]+$/, '') || '',
        organizer: result.organizer || '',
        role: result.role || '',
        description: result.description || manualText.trim(),
        category: normalizeCategory(result.category),
        date: result.date || today(),
        team_size: result.team_size,
        rank: result.rank,
      });

      setFeedback({ type: 'success', message: '解析完成，请确认并补充细节。' });
    } catch (error) {
      console.error('Achievement extraction failed:', error);
      setFeedback({ type: 'error', message: 'OCR 或 AI 解析失败，请稍后重试。' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData) {
      return;
    }

    const title = extractedData.title?.trim();
    const description = extractedData.description?.trim();

    if (!title || !description) {
      setFeedback({ type: 'error', message: '请至少补全成果名称和描述。' });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userId = user?.id || 'demo-user-id';

      let imageUrl = '';
      if (selectedFile && selectedFile.type.startsWith('image/') && user) {
        imageUrl = await uploadAchievementImage(selectedFile, user.id);
      }

      const newExperience: Experience = {
        id: crypto.randomUUID(),
        user_id: userId,
        title,
        organizer: extractedData.organizer?.trim() || '待补充',
        date: extractedData.date || today(),
        role: extractedData.role?.trim() || '参与成员',
        description,
        outcomes: [],
        category: normalizeCategory(extractedData.category),
        tags: [],
        verified: false,
        image_url: imageUrl,
        team_size: extractedData.team_size,
        rank: extractedData.rank,
      };

      if (user) {
        const { error } = await supabase.from('experiences').insert(newExperience);
        if (error) {
          throw error;
        }
      }

      onAddExperience(newExperience);
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败，请稍后再试。';
      console.error('Achievement save failed:', error);
      setFeedback({ type: 'error', message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl animate-fade-in space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            成果同步中心
          </h2>
          <p className="mt-2 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
            Upload, extract and sync achievements
          </p>
        </div>

        <div className="inline-flex items-center gap-3 rounded-[24px] border border-indigo-100 bg-indigo-50 px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600">
          <Cpu className="h-4 w-4" />
          Aliyun OCR + DeepSeek + Supabase
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-3 rounded-[24px] border px-4 py-4 text-sm font-semibold ${
            feedback.type === 'error'
              ? 'border-red-100 bg-red-50 text-red-600'
              : feedback.type === 'success'
                ? 'border-green-100 bg-green-50 text-green-600'
                : 'border-blue-100 bg-blue-50 text-blue-600'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : feedback.type === 'success' ? (
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {!extractedData ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (event.dataTransfer.files[0]) {
              handleFile(event.dataTransfer.files[0]);
            }
          }}
          className={`relative min-h-[420px] overflow-hidden rounded-[44px] border-4 border-dashed p-6 transition-all sm:p-10 ${
            isDragging
              ? 'border-blue-500 bg-blue-50/70'
              : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50/60'
          }`}
        >
          <div className="absolute left-8 top-8 h-28 w-28 rounded-full bg-blue-100/60 blur-3xl" />
          <div className="absolute bottom-8 right-8 h-28 w-28 rounded-full bg-indigo-100/60 blur-3xl" />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(event) => {
              const nextFile = event.target.files?.[0];
              if (nextFile) {
                handleFile(nextFile);
              }
            }}
          />

          {selectedFile ? (
            <div className="relative z-10 flex h-full flex-col items-center justify-center">
              {preview === 'document_placeholder' ? (
                <div className="flex h-56 w-44 items-center justify-center rounded-[28px] border border-slate-200 bg-slate-100 shadow-inner">
                  <FileText className="h-16 w-16 text-slate-300" />
                </div>
              ) : (
                <img
                  src={preview || ''}
                  alt="Achievement preview"
                  className="max-h-[280px] w-full max-w-md rounded-[28px] border-4 border-white object-contain shadow-2xl"
                />
              )}

              <div className="mt-8 w-full max-w-2xl space-y-5">
                <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:text-left">
                  <FileCheck className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-black text-slate-800">{selectedFile.name}</span>
                  <span className="text-xs font-semibold text-slate-400">
                    可补充背景说明，系统会先用阿里云 OCR 识别，再交给 AI 整理
                  </span>
                </div>

                <textarea
                  placeholder="补充活动背景、举办方、获奖等级或项目结果（可选）"
                  className="min-h-[120px] w-full rounded-[28px] border-2 border-slate-100 bg-white p-5 text-sm font-medium leading-relaxed text-slate-700 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500"
                  value={manualText}
                  onChange={(event) => setManualText(event.target.value)}
                />

                <div className="flex flex-col gap-4 sm:flex-row">
                  <button
                    type="button"
                    onClick={resetSelection}
                    className="flex-1 rounded-[22px] bg-slate-100 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all hover:bg-slate-200"
                  >
                    重新选择
                  </button>
                  <button
                    type="button"
                    onClick={() => void processWithAI()}
                    disabled={isProcessing}
                    className="flex-[2] rounded-[22px] bg-blue-600 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-blue-100 transition-all hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        正在解析
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        开始 AI 识别
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
              <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[32px] bg-blue-50 shadow-inner">
                <Upload className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-slate-800">
                拖拽证书、截图或 PDF 到这里
              </h3>
              <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-slate-400">
                支持 JPG、PNG、WebP 和 PDF。上传文件后可补充文字说明，系统会先用阿里云 OCR 识别，再由 DeepSeek 整理成结构化成果描述。
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-8 rounded-[22px] border-2 border-slate-100 bg-white px-10 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-800 shadow-sm transition-all hover:border-blue-500 hover:text-blue-600"
              >
                浏览本地文件
              </button>

              <div className="mt-8 w-full max-w-2xl rounded-[30px] border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                <p className="mb-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  或直接粘贴成果描述
                </p>
                <textarea
                  placeholder="例如：参加 2025 挑战杯校赛，负责前端开发，获得二等奖..."
                  className="min-h-[110px] w-full rounded-[24px] border-2 border-slate-100 bg-white p-4 text-sm font-medium leading-relaxed text-slate-700 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500"
                  value={manualText}
                  onChange={(event) => setManualText(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => void processWithAI()}
                  disabled={isProcessing || !manualText.trim()}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-[20px] bg-slate-900 px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-slate-800 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  解析文字
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-[44px] border border-slate-100 bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-green-50 text-green-500">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">AI 解析完成</h3>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">
                Review and refine the extracted result
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  成果名称
                </label>
                <input
                  className="w-full rounded-[22px] border-2 border-slate-100 bg-slate-50 p-4 font-bold text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white"
                  value={extractedData.title || ''}
                  onChange={(event) =>
                    setExtractedData((current) =>
                      current ? { ...current, title: event.target.value } : current,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  举办方
                </label>
                <input
                  className="w-full rounded-[22px] border-2 border-slate-100 bg-slate-50 p-4 font-bold text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white"
                  value={extractedData.organizer || ''}
                  onChange={(event) =>
                    setExtractedData((current) =>
                      current ? { ...current, organizer: event.target.value } : current,
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    担任角色
                  </label>
                  <input
                    className="w-full rounded-[22px] border-2 border-slate-100 bg-slate-50 p-4 font-bold text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white"
                    value={extractedData.role || ''}
                    onChange={(event) =>
                      setExtractedData((current) =>
                        current ? { ...current, role: event.target.value } : current,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    发生时间
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-[22px] border-2 border-slate-100 bg-slate-50 p-4 font-bold text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white"
                    value={extractedData.date || ''}
                    onChange={(event) =>
                      setExtractedData((current) =>
                        current ? { ...current, date: event.target.value } : current,
                      )
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  成果类型
                </label>
                <select
                  className="w-full rounded-[22px] border-2 border-slate-100 bg-slate-50 p-4 font-bold text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white"
                  value={normalizeCategory(extractedData.category)}
                  onChange={(event) =>
                    setExtractedData((current) =>
                      current
                        ? { ...current, category: normalizeCategory(event.target.value) }
                        : current,
                    )
                  }
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                STAR 描述
              </label>
              <textarea
                className="min-h-[260px] w-full rounded-[22px] border-2 border-slate-100 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white"
                value={extractedData.description || ''}
                onChange={(event) =>
                  setExtractedData((current) =>
                    current ? { ...current, description: event.target.value } : current,
                  )
                }
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setExtractedData(null);
                setFeedback(null);
              }}
              className="flex-1 rounded-[24px] bg-slate-100 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500 transition-all hover:bg-slate-200"
            >
              重新解析
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isProcessing}
              className="flex-[2] rounded-[24px] bg-blue-600 px-6 py-4 text-xs font-black uppercase tracking-[0.22em] text-white shadow-2xl shadow-blue-100 transition-all hover:bg-blue-700 disabled:opacity-60"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  正在保存
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  确认并同步到成长轨迹
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            icon: Trophy,
            title: '竞赛奖项',
            description: '自动提取奖项名称、排名、举办方和时间信息。',
          },
          {
            icon: Users,
            title: '项目经历',
            description: '辅助整理团队角色、职责分工和结果产出。',
          },
          {
            icon: Sparkles,
            title: '实习证明',
            description: '把零散文字整理成更适合简历的结构化描述。',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-5 rounded-[30px] border border-slate-100 bg-white p-6 transition-all hover:border-blue-100"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-slate-50 text-slate-400">
              <item.icon className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900">{item.title}</h4>
              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-400">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
