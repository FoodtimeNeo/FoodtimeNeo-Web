<template>
  <footer class="app-footer torn-edge">
    <div class="app-footer__inner">
      <div>
        <p class="app-footer__title">食堂日记 / BJTU Canteen Zine</p>
        <p class="app-footer__desc handwrite">
          “今天排队 20 分钟，值不值看这口。”
        </p>
      </div>
      <div class="app-footer__actions">
        <RouterLink :to="{ name: 'landing' }" class="app-footer__portal-link">
          进入官网 →
        </RouterLink>
        <p class="app-footer__meta">2026 · 北交干饭吧 · 学生自制版本</p>
      </div>
    </div>
    <span
      class="app-footer__decor app-footer__decor--stamp"
      aria-hidden="true"
    ></span>
    <span
      class="app-footer__decor app-footer__decor--doodle"
      aria-hidden="true"
    ></span>
    <span
      class="app-footer__decor app-footer__decor--torn"
      aria-hidden="true"
    ></span>
  </footer>
</template>

<style scoped lang="scss">
.app-footer {
  position: relative;
  overflow: hidden;
  border-top: 1px solid var(--ft-color-secondary);
  background: rgb(242 239 230 / 94%);
}

.app-footer__inner {
  position: relative;
  z-index: 2;
  display: flex;
  width: min(100%, calc(var(--page-max-width) + var(--zine-page-padding) * 2));
  min-height: 86px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 auto;
  padding: 16px var(--zine-page-padding);
}

.app-footer__title,
.app-footer__meta {
  margin: 0;
}

.app-footer__title {
  font-family: var(--ft-font-family-title);
  font-weight: 900;
  letter-spacing: 0.03em;
}

.app-footer__desc {
  margin: 2px 0 0;
  color: var(--ft-color-text-muted);
  font-size: 18px;
}

.app-footer__meta {
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}

.app-footer__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;

  @media (max-width: 640px) {
    align-items: flex-start;
  }
}

.app-footer__portal-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--ft-font-size-sm);
  font-weight: 700;
  color: var(--ft-color-primary);
  text-decoration: none;
  padding: 3px 10px;
  border-radius: var(--ft-radius-sm);
  border: 1px dashed var(--ft-color-primary);
  background: rgb(201 52 30 / 6%);
  transition: all var(--ft-transition-fast);

  &:hover {
    background: var(--ft-color-primary);
    color: #fff;
    border-style: solid;
    transform: translateX(2px);
  }
}

.app-footer__decor {
  position: absolute;
  z-index: 1;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.app-footer__decor--stamp {
  top: -34px;
  left: max(460px, calc((100vw - var(--page-max-width)) / 2 + 452px));
  width: 138px;
  height: 138px;
  background-image: var(--zine-decor-stamp-chinese);
  opacity: 0.2;
  transform: rotate(-7deg);
}

.app-footer__decor--doodle {
  right: max(18px, calc((100vw - var(--page-max-width)) / 2 - 6px));
  bottom: 8px;
  width: 116px;
  height: 74px;
  background-image: var(--zine-decor-arrow);
  opacity: 0.26;
  transform: rotate(6deg);
}

.app-footer__decor--torn {
  bottom: -34px;
  left: max(18px, calc((100vw - var(--page-max-width)) / 2 - 28px));
  width: 300px;
  height: 86px;
  background-image: var(--zine-decor-torn-edge);
  opacity: 0.24;
}

@media (max-width: 768px) {
  .app-footer {
    display: none;
  }
}
</style>
