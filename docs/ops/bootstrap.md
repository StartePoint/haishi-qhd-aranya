# 海拾阿那亚代购地 · 云开发初始化

## 目录说明

| 目录 | 用途 |
|------|------|
| `miniprogram/` | 微信小程序（用户端） |
| `server/` | 服务端：云函数、共享逻辑、脚本 |
| `admin/` | 后端管理 Web 页面 |

## 1. 准备

1. 注册微信小程序，拿到 AppID  
2. 开通「云开发」，创建环境，记下 **环境 ID**  
3. 修改：
   - `miniprogram/app.js` 中 `wx.cloud.init({ env: '环境ID' })`
   - `project.config.json` 中 `appid`（`cloudfunctionRoot` 已指向 `server/cloudfunctions/`）
   - `admin/.env`：`VITE_CLOUDBASE_ENV=环境ID`

## 2. 同步公共模块并上传云函数

```bash
node server/scripts/sync-common.js
```

在微信开发者工具中打开本仓库根目录，对 `server/cloudfunctions/` 下各函数右键上传（先对各目录执行 `npm install`）：

- `login`
- `catalog`
- `lead`
- `adminAuth`
- `adminCatalog`
- `adminLead`
- `adminConfig`
- `seedAdmin`

## 3. 创建首个管理员

云函数测试调用 `seedAdmin`：

```json
{
  "setupKey": "haishi-init-once",
  "username": "admin",
  "password": "你的强密码至少8位"
}
```

创建成功后建议停用或删除 `seedAdmin`。

## 4. 数据库集合与权限

创建集合：`categories`、`sub_categories`、`products`、`fee_rules`、`leads`、`configs`、`admins`。

建议权限：**所有写操作仅云函数**；C 端不直连写库。

建议索引：

- `leads`：`openid` 升序 + `createdAt` 降序  
- `products`：`categoryId` + `onSale` + `sort`  
- `admins`：`token`  
- `configs`：`key`

## 5. 管理端

```bash
cd admin
npm install
npm run dev
```

浏览器打开本地地址，用管理员账号登录。

**注意：** 管理端通过 `@cloudbase/js-sdk` 调云函数。需在云开发控制台为管理端调用场景配置：

- 允许未登录访问上述 admin 云函数，**或**
- 配置自定义登录后再调用  

鉴权仍以云函数内 `token` 校验为准。

## 6. 验收清单

1. 管理端：品类 → 种类 → 商品 → 费用 → 上架  
2. 小程序：分类/详情费用拆分正确（有规则 / 无规则）  
3. 留资成功，后台询价可见并可改状态  
4. 首页采购提醒与公告可配置生效  

## 7. 费用单测

```bash
cd server/shared
node --test fee.test.js
```
