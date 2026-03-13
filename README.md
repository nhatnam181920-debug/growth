# 青网站

本项目基于 `Vite + React + Supabase`，当前已接入：

- Supabase 用户、数据库与存储
- DeepSeek 文本生成与结构化能力
- 阿里云原生 OCR，用于图片 / PDF 文字识别
- 本地 Node 服务代理 `/api/deepseek/*` 与 `/api/aliyun/ocr*`

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 配置环境变量  
复制 `.env.example` 为 `.env.local`，并填写：

- `DEEPSEEK_API_KEY`
- `ALIBABA_CLOUD_ACCESS_KEY_ID`
- `ALIBABA_CLOUD_ACCESS_KEY_SECRET`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

可选项：

- `DEEPSEEK_BASE_URL`，默认 `https://api.deepseek.com`
- `DEEPSEEK_MODEL`，默认 `deepseek-chat`
- `ALIBABA_CLOUD_OCR_ENDPOINT`，默认 `ocr-api.cn-hangzhou.aliyuncs.com`
- `ALIBABA_CLOUD_OCR_REGION`，默认 `cn-hangzhou`
- `ALIBABA_CLOUD_OCR_TYPE`，默认 `Advanced`

3. 启动开发环境

```bash
npm run dev
```

4. 生产构建与本地预览

```bash
npm run build
npm run preview
```

## 识别流程

上传页现在采用两段式处理：

1. 图片 / PDF 先走阿里云原生 OCR 提取文字
2. 提取出的文字再交给 DeepSeek 结构化为成果字段

这样可以同时兼顾证书、奖状、项目截图和文字补充说明。

## 生产部署

Zeabur 建议配置：

- Build Command: `npm run build`
- Start Command: `npm run start`

生产环境变量至少需要：

- `DEEPSEEK_API_KEY`
- `ALIBABA_CLOUD_ACCESS_KEY_ID`
- `ALIBABA_CLOUD_ACCESS_KEY_SECRET`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 安全提醒

阿里云 `AccessKey` 和 DeepSeek 密钥都只能放在服务端环境变量中，不要写入前端代码，也不要提交到仓库。
