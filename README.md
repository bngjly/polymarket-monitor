# 🐋 PolyTracker — Polymarket 聪明钱监控器

实时追踪 Polymarket 上高胜率交易者的持仓和交易活动。

## ✨ 功能

- 📊 **排行榜** — Top 50 交易者排名（按 PnL 或交易量）
- 🔍 **多维过滤** — 按分类（政治/体育/加密等）和时间周期筛选
- ⭐ **聪明钱追踪** — 一键查看 aenews2、YatSen、ImJustKen 等知名高手地址
- 💼 **持仓详情** — 查看交易者当前持仓（方向、价格、价值）
- 📈 **交易活动** — 最近交易活动流
- 🔎 **地址搜索** — 手动输入任意钱包地址查询
- 🔄 **自动刷新** — 每 60 秒自动更新数据

## 🛠️ 技术栈

- **纯前端**：HTML + CSS + JavaScript（零框架依赖）
- **API**：Polymarket Data API + Gamma API（公开免费，无需认证）
- **设计**：深色 Glassmorphism 主题，响应式布局

## 🚀 快速启动

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/polymarket-monitor.git
cd polymarket-monitor

# 启动本地服务器（任选一种）
python -m http.server 8080
# 或
npx serve .

# 在浏览器中打开
# http://localhost:8080
```

## ⚠️ 注意事项

- 如遇 CORS 限制，建议安装浏览器插件 [CORS Unblock](https://chrome.google.com/webstore/detail/cors-unblock/) 或使用代理
- Polymarket API 为公开接口，无需 API Key

## 📄 License

MIT
