# 海拾阿那亚代购地 · 本机启动（Flask + SQLite）

## 目录

| 目录 | 用途 |
|------|------|
| `miniprogram/` | 微信小程序 |
| `server/` | Flask 服务端 + SQLite |
| `admin/` | Vue 管理端 |

## 1. 启动服务端

```bash
cd server
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python run.py
```

默认：`http://127.0.0.1:5000`  
默认管理员：`admin` / `admin12345`（可用环境变量修改）  
开发默认开启 `WECHAT_MOCK_OPENID=1`（无需真实微信密钥即可登录）。

## 2. 启动管理端

```bash
cd admin
copy .env.example .env
npm install
npm run dev
```

浏览器打开 Vite 地址，登录后台维护品类/商品/配置。

## 3. 小程序

1. 微信开发者工具打开仓库根目录  
2. 详情 → 本地设置 → **不校验合法域名**  
3. `miniprogram/utils/config.js` 中 `baseUrl` 指向本机 API（真机改局域网 IP）  
4. 编译预览

## 4. 验收

1. `/health` 返回 ok  
2. 管理端可登录并上架商品  
3. 小程序首页/分类可请求成功（可无商品）  
4. 留资写入后管理端询价可见  

## 5. 单测

```bash
cd server
.\.venv\Scripts\activate
pytest -v
```
