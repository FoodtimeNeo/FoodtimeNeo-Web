# FoodTime Neo / 北交干饭吧 — 官网设计素材包

本包将之前生成的 **3 张素材合集图**按区域拆为独立 PNG，另附先前生成的 8 张单独素材。

## 目录

- `A/`：第一张合集；`B/`：第二张合集；`C/`：第三张合集。
- `branding/`：标志、标题和宣传文案图片（建议官网正文改用 HTML 文本）。
- `mockups/`：手机产品界面展示（示意画面，不代表真实产品截图）。
- `campus/`：校园建筑、食堂和学生插画。
- `food/`：菜品、饮品摄影风格插画。
- `stickers/`：便签、手账字样、邮戳及照片纸贴。
- `illustrations/`：小图标、涂鸦、线稿、校园草木。
- `icons/`：分类图标。
- `buttons/`：生成图中的按钮外观 **仅供视觉参考，不应直接充当可交互按钮**。
- `components/`：搜索框、标签等视觉片段，真实控件建议用 Vue/CSS 实现。
- `paper/`：纸张纹理与色块。
- `extras-original-assets/`：此前单独生成的 8 张图。
- `source-boards/`：三张原始素材板，便于回溯。
- `manifest.json`：每项的路径、源坐标、尺寸、抠图方式和质量说明。

## 重要限制

原始合集都是 **已合成的平面位图，并非带图层的 PSD/Figma**。背景渐变、投影、笔触和重叠对象已经烘焙进像素。

1. `transparent-mask (approximate)`：以边缘多边形、圆形或渐隐遮罩进行人工透明裁切；边缘可能带少量原背景，部分对象被遮挡处无法恢复。
2. `transparent-color-key (approximate)`：提取颜色较鲜明的手绘线条；复杂背景中可能混入/损失笔触。
3. `flattened-crop (background included)`：保留原画面的矩形独立裁片，无法无损去掉背景，不属于透明图片。
4. 生成图中的中文文字、校徽/学校建筑、美食评价和手机界面均是 AI 示意内容；真实部署需核对品牌名称、校园元素的准确性及应用真实截图。
5. `A`、`B`、`C` 部分内容相似，保留各版本供筛选。请根据 `manifest.json` 选择可复用项，不建议全部叠放到首页。

## Vue 使用示例

将需使用的图片放入项目的 `src/assets/official/`，在组件中 `import` 或直接使用相对路径。例如：

```vue
<script setup>
import phone from '@/assets/official/A/mockups/A_phone-app-mockup.png'
</script>
<template>
  <img class="hero-phone" :src="phone" alt="FoodTime 安卓应用界面示意" />
</template>
<style scoped>
.hero-phone { width: min(40vw, 410px); height: auto; object-fit: contain; }
</style>
```

推荐将下载按钮、主标题、正文和 FAQ 改为真正的 HTML/CSS：更清晰、更适应响应式、易维护、可访问。
