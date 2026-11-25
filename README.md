# 星邮岛 · 折叠图志（The Starpost Atlas）

一本摊开在桌面上的 3D 纸艺立体图志绘本：拖动书页或底部滑块平滑翻页、拖动书外空白处旋转观察，陪小狐狸邮差 **阿橘** 穿过星邮岛的五个地标，收集五枚星邮印记，把迷路的流星寄回银河。

- **在线阅读**：https://chatyu12.github.io/starpost-folded-atlas/ （支持 `#harbor`、`#ginkgo`、`#bridge`、`#greenhouse`、`#tower` 直达各章）
- **交互特色**：
  - 3D 纸艺立体书：40 细分可弯曲纸页，支持手拖翻页与底部滑块连续慢翻；
  - 5 章专属地标互动：点击黄铜邮筒、石灯笼、桥头风铃、月光花、黄铜星盘触发光影、粒子动画与 Web Audio 拟音，收集 5 枚星邮印记；
  - 折叠全岛地图：随时展开纸岛全图查看集章进度并直达任意章节；
  - 精装阅读页：每章配有一幅完整水粉纸艺风插画与故事正文。

## 目录结构

- `index.html` / `table.css` / `reader.js` / `story.js`：零构建原生 ES Module 前端应用（Three.js 0.160）
- `art/ill/*.webp`：5 张全幅水粉纸艺风格章节插画
- `art/*.webp` & `art/svg/*.svg`：19 个纸艺分层 3D 立体拆件
- `tools/gen_cutouts.py`：纸艺 SVG 拆件生成与透明 WebP 渲染脚本
- `STORY.md`：完整 5 章分镜与互动设计脚本
