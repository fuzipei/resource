# 共鸣音乐 · Vercel 部署包（不含管理后台）

本包包含当前前台、用户账号与歌单、音乐搜索播放、歌词、皮肤及必要服务端 API。管理页面、管理 API、管理员认证、管理组件和样式均已排除。

## 部署
1. 解压，把本目录内容放到 Git 仓库根目录，再在 Vercel 导入。框架选择 Next.js，Node.js 22.x。
2. Settings → Environment Variables 添加 REDIS_URL，填入现有 Upstash 的 Redis TLS 连接（rediss://…，不是 HTTPS REST URL）。数据库连接仅在服务端读取，不使用 NEXT_PUBLIC_ 前缀。本包没有内置数据库地址或密码。
3. 如使用账号密码登录或注册，配置 TURNSTILE_SITE_KEY、TURNSTILE_SECRET_KEY，并在 Cloudflare Turnstile 中加入正式域名。配置 REGISTRATION_INVITE_CODE 作为注册邀请码。SITE_URL 填正式站点地址。
4. 安装命令 npm ci，构建 npm run build，输出目录保持 Next.js 默认设置。之后部署。修改环境变量后重新部署。

连接原 Redis 时会沿用现有用户和歌单，以及已有公告、Turnstile、SSO 配置；数据库内已有 Turnstile 设置优先于环境变量。SSO 回调为 /api/sso/github/callback、/api/sso/google/callback、/api/sso/linuxdo/callback，需要在对应平台登记正式域名。本包没有管理入口，不能从此包管理这些配置。

不需要 ADMIN 或 PASSWORD 环境变量，设置它们也不会启用后台。/api/admin 和旧管理地址应返回 404。

这是全栈源码包，不是静态网站包。npm ci 与生产构建已经验证。压缩包不含 node_modules、.next、本机环境文件、真实密钥或数据库备份。

本地可将 ENVIRONMENT.example 复制为 .env.local，填写自己的值，再 npm ci 和 npm run dev。不要提交 .env.local。
