# 海拾阿那亚代购地

仓库按三端拆分：

```text
haishi-qhd-anaya/
├── miniprogram/     # 微信小程序（用户端）
├── server/          # 服务端
│   ├── cloudfunctions/   # 微信云函数
│   ├── shared/           # 费用等纯函数与单测
│   └── scripts/          # 同步 common 等脚本
├── admin/           # 后端管理 Web（Vue 3）
├── docs/            # 规格与运维文档
└── project.config.json   # 小程序工程配置（指向 miniprogram + server/cloudfunctions）
```

初始化与部署见 [docs/ops/bootstrap.md](docs/ops/bootstrap.md)。
