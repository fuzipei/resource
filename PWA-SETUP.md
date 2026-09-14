# 共鸣 PWA

部署后在“设置 → 安装共鸣”安装。支持安装提示的浏览器会显示安装按钮；其他浏览器显示菜单安装说明。应用以独立窗口启动。需要 HTTPS（本地 localhost 可测试）。

PWA 只缓存 offline.html 和三个 PNG 图标，约 29 KB；不缓存 API、账号数据、歌曲和音频片段。离线仅提供重连页面，不支持离线听歌。已有收藏及歌单仍由原账号功能管理。

静态资源在 public/manifest.webmanifest、public/sw.js、public/offline.html、public/icons/。PwaProvider 只在生产模式注册 Service Worker。更新离线资源时同步递增 sw.js 中 CACHE 的版本号。旧应用窗口关闭后新 Worker 激活，并清除旧版 PWA 缓存；不主动刷新正在播放的窗口。

验证：npm run build；生产浏览器安装条件无错误、192/512 图标尺寸正确、设置安装入口正常；断开测试服务后离线页可用，CacheStorage 仅四个文件。未在用户设备实际执行安装。

参考：https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
