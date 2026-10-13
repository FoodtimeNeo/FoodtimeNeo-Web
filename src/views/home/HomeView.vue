<script setup>
import foodSketch from '@/assets/images/decoration/手绘美食01.png';
</script>

<template>
  <main class="style-preview">
    <div class="style-preview__meta">
      <span class="sticker sticker--r-2">视觉样张 01</span>
      <span class="stamp">阶段一</span>
    </div>

    <p class="style-preview__eyebrow handwrite">
      FOODTIME · CAMPUS DINING NOTES
    </p>
    <h1>北交干饭吧</h1>
    <p class="style-preview__intro">把每天的一餐，写成一页有温度的食堂手账。</p>
    <img
      class="style-preview__illustration"
      :src="foodSketch"
      alt=""
      width="800"
      height="800"
    />

    <section class="style-preview__sample" aria-labelledby="sample-title">
      <div class="section-rule" aria-hidden="true">
        <span class="section-rule__index">01</span>
        <span class="section-rule__line"></span>
      </div>
      <h2 id="sample-title" class="section-title">
        从一张<span class="zine-highlight">纸</span>开始
      </h2>
      <p class="section-subtitle">牛皮纸、朱红印章、墨棕描边和纸胶带。</p>

      <div class="style-preview__controls">
        <button class="button-ink is-primary" type="button">主按钮样例</button>
        <button class="button-ink" type="button">次按钮样例</button>
        <span class="sticker sticker--r2">今日限定</span>
        <span class="stamp">好吃认证</span>
      </div>
    </section>

    <p class="style-preview__note">
      这是阶段一的视觉样张。食堂、档口和菜品数据将在后续阶段接入。
    </p>
  </main>
</template>

<style scoped lang="scss">
.style-preview {
  position: relative;
  width: min(calc(100% - var(--zine-page-padding) * 2), var(--page-max-width));
  margin: var(--ft-space-6) auto;
  padding: var(--ft-space-5);
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
  box-shadow: var(--ft-shadow-lg);

  &__meta,
  &__controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ft-space-2);
  }

  &__meta {
    justify-content: space-between;
  }

  &__eyebrow {
    margin: var(--ft-space-6) 0 var(--ft-space-1);
    color: var(--zine-stamp-red);
    font-size: var(--ft-font-size-lg);
  }

  h1 {
    margin: 0;
    font-family: var(--ft-font-family-title);
    font-size: var(--ft-font-size-2xl);
    font-weight: 900;
    line-height: 1.08;
  }

  &__intro {
    margin: var(--ft-space-2) 0 var(--ft-space-6);
    font-size: var(--ft-font-size-lg);
  }

  &__illustration {
    position: absolute;
    top: 90px;
    right: var(--ft-space-5);
    width: 180px;
    height: auto;
    filter: drop-shadow(6px 8px 0 rgb(58 36 24 / 12%));
    transform: rotate(7deg);
  }

  &__sample {
    padding: var(--ft-space-4);
    border: 1px dashed var(--zine-paper-edge);
    background: var(--zine-paper-card-alt);
  }

  &__controls {
    margin-top: var(--ft-space-4);
  }

  &__note {
    margin: var(--ft-space-4) 0 0;
    color: var(--ft-color-text-muted);
    font-size: var(--ft-font-size-sm);
  }
}

@media (max-width: 768px) {
  .style-preview {
    width: calc(100% - var(--zine-page-padding-mobile) * 2);
    margin: var(--app-mobile-section-gap) auto;
    padding: var(--app-mobile-card-padding);
    box-shadow: var(--app-mobile-shadow);

    &__eyebrow {
      margin-top: var(--ft-space-4);
    }

    &__intro {
      font-size: var(--ft-font-size-md);
    }

    &__illustration {
      position: static;
      width: 120px;
      margin: calc(-1 * var(--ft-space-4)) 0 var(--ft-space-2) auto;
      transform: none;
    }

    &__sample {
      padding: var(--ft-space-2);
    }
  }
}
</style>
