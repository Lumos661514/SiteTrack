# SiteTrack

电商运营后台，并接入一个自研的前端监控 SDK。菜单按角色从后端下发，订单列表用自己写的虚拟滚动展示 5 万条数据。

## 技术栈

- 前端：Vue 3、TypeScript、Vite、Vue Router、Pinia、Element Plus、Axios、ECharts
- 后端：Node.js、Express、MySQL、JWT
- 监控 SDK：TypeScript，同时打包 ESM 和 UMD

## 目录

- `web` 运营后台
- `server` 接口和数据库脚本
- `sdk` 前端监控 SDK

## 本地启动

需要本机已安装 Node.js 22、pnpm（可用 `corepack pnpm`）和 MySQL，且 MySQL 能用配置里的账号登录。

```bash
corepack pnpm install
cp server/.env.example server/.env
corepack pnpm db:init
corepack pnpm dev
```

- 后台：http://localhost:5173
- 接口：http://127.0.0.1:3000

`db:init` 会重建库并写入 5 万条订单。演示账号密码都是 `123456`：

| 账号 | 角色 | 能看到的差异 |
| --- | --- | --- |
| admin | 超级管理员 | 全部菜单，可以新增商品、发货 |
| operator | 运营 | 没有系统管理，不能新增商品 |
| service | 客服 | 只有工作台和订单，可以取消订单，不能发货 |

## 打包

```bash
corepack pnpm build
```

这会先构建 SDK，再构建后台。后台静态文件在 `web/dist`，SDK 产物在 `sdk/dist`。

优化前首屏只有一个 JS，gzip **758 KB**。路由懒加载、ECharts 按需引入、手动拆包之后，首屏 JS（入口 + Vue + Element Plus）gzip **370 KB**，大约少了一半。图表单独成块，gzip **182 KB**，只在打开数据看板时下载。商品列表页面 gzip **3.5 KB**。

## 部署

1. 服务器安装 Node.js 22 和 MySQL。
2. 配置 `server/.env`：数据库账号、`JWT_SECRET`、`MONITOR_APP_KEY`。`MONITOR_APP_KEY` 要和 `web/src/main.ts` 里 SDK 的 `appKey` 一致，默认是 `sitetrack-demo`。
3. 执行 `corepack pnpm install`、`corepack pnpm db:init`、`corepack pnpm build`。
4. 用进程管理器启动接口：`corepack pnpm --filter server start`，监听 3000 端口。
5. 用 Nginx 托管 `web/dist`，并把 `/api` 反代到接口。

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/sitetrack;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

`try_files` 把前端路由交给 `index.html`，否则刷新 `/order` 会 404。

## 简历描述

SiteTrack 是一个电商运营后台，包含登录鉴权、按角色下发的动态路由、商品与分类、5 万条订单、库存、销售看板，以及自研前端监控 SDK。

- 使用 JWT 和路由守卫完成登录，Axios 统一注入 token、处理 401，并取消重复请求。
- 菜单由后端按角色返回，前端 `addRoute` 生成路由，侧边栏递归渲染；按钮权限和接口使用同一套权限码，运营调用新增商品接口返回 403。
- 自研虚拟滚动展示 5 万条订单，页面实际只渲染约 20 个节点；订单流转用状态机限制，无发货权限的请求返回 403。
- 自研监控 SDK（gzip 约 1.9 KB），覆盖 JS、Promise、资源错误以及 FCP、LCP、INP、CLS，关页使用 sendBeacon，失败写入 localStorage 重试。
- 路由懒加载和手动拆包后，首屏 JS gzip 从 758 KB 降到 370 KB。
