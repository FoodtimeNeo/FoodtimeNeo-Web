<script setup>
import { nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { ElDialog } from 'element-plus';
import InkButton from '@/components/base/InkButton.vue';
import {
  MAX_AVATAR_BYTES,
  cropGeometry,
  readAvatarDimensions,
} from '@/utils/avatarCrop.js';
const props = defineProps({ file: { type: File, required: true } });
const emit = defineEmits(['confirm', 'cancel']);
const canvas = ref(null),
  ready = ref(false),
  encoding = ref(false),
  error = ref('');
const position = reactive({ zoom: 1, x: 0, y: 0, rotation: 0 });
let bitmap,
  alive = true,
  pointer;
function geometry() {
  return cropGeometry(
    bitmap.width,
    bitmap.height,
    position.rotation,
    position.zoom,
    position.x,
    position.y,
  );
}
function paint(ctx, g) {
  ctx.save();
  ctx.translate(320 + g.panX, 280 + g.panY);
  ctx.rotate((position.rotation * Math.PI) / 180);
  ctx.drawImage(
    bitmap,
    (-bitmap.width * g.scale) / 2,
    (-bitmap.height * g.scale) / 2,
    bitmap.width * g.scale,
    bitmap.height * g.scale,
  );
  ctx.restore();
}
function draw() {
  if (!bitmap || !canvas.value) return;
  const ctx = canvas.value.getContext('2d'),
    g = geometry();
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(0, 0, 640, 560);
  paint(ctx, g);
  ctx.fillStyle = '#000a';
  ctx.fillRect(0, 0, 640, 40);
  ctx.fillRect(0, 520, 640, 40);
  ctx.fillRect(0, 40, 80, 480);
  ctx.fillRect(560, 40, 80, 480);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.strokeRect(80, 40, 480, 480);
  ctx.strokeStyle = '#ffffff80';
  ctx.lineWidth = 1;
  for (const n of [1, 2]) {
    ctx.beginPath();
    ctx.moveTo(80 + n * 160, 40);
    ctx.lineTo(80 + n * 160, 520);
    ctx.moveTo(80, 40 + n * 160);
    ctx.lineTo(560, 40 + n * 160);
    ctx.stroke();
  }
}
watch(() => [position.zoom, position.x, position.y, position.rotation], draw, {
  flush: 'post',
});
onMounted(async () => {
  try {
    await readAvatarDimensions(props.file);
    const image = await createImageBitmap(props.file, {
      imageOrientation: 'from-image',
    });
    if (!alive) {
      image.close();
      return;
    }
    bitmap = image;
    ready.value = true;
    await nextTick();
    draw();
  } catch (failure) {
    if (alive) error.value = failure.message || '图片无法读取，请重新选择';
  }
});
onUnmounted(() => {
  alive = false;
  bitmap?.close();
  bitmap = null;
});
function move(dx, dy) {
  const g = geometry();
  position.x = g.panX + dx;
  position.y = g.panY + dy;
  const clamped = geometry();
  position.x = clamped.panX;
  position.y = clamped.panY;
}
function start(event) {
  if (!ready.value || encoding.value) return;
  event.currentTarget.setPointerCapture(event.pointerId);
  pointer = { x: event.clientX, y: event.clientY };
}
function drag(event) {
  if (!pointer || encoding.value) return;
  const scale = 640 / canvas.value.getBoundingClientRect().width;
  move(
    (event.clientX - pointer.x) * scale,
    (event.clientY - pointer.y) * scale,
  );
  pointer = { x: event.clientX, y: event.clientY };
}
function key(event) {
  if (!ready.value || encoding.value) return;
  const delta = {
    ArrowLeft: [-12, 0],
    ArrowRight: [12, 0],
    ArrowUp: [0, -12],
    ArrowDown: [0, 12],
  }[event.key];
  if (delta) {
    event.preventDefault();
    move(...delta);
  }
}
function reset() {
  Object.assign(position, { zoom: 1, x: 0, y: 0, rotation: 0 });
}
function rotate() {
  position.rotation = (position.rotation + 90) % 360;
  position.x = 0;
  position.y = 0;
}
function cancel() {
  if (!encoding.value) emit('cancel');
}
async function accept() {
  if (!bitmap || encoding.value) return;
  encoding.value = true;
  error.value = '';
  try {
    const output = document.createElement('canvas');
    output.width = 512;
    output.height = 512;
    const ctx = output.getContext('2d'),
      g = geometry();
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, 512, 512);
    ctx.scale(512 / g.side, 512 / g.side);
    ctx.translate(-g.x, -g.y);
    paint(ctx, g);
    const blob = await new Promise((resolve) =>
      output.toBlob(resolve, 'image/jpeg', 0.9),
    );
    if (!blob || blob.size > MAX_AVATAR_BYTES)
      throw new Error('头像生成失败或超过10MB，请重新裁剪');
    if (alive)
      emit('confirm', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
  } catch (failure) {
    if (alive) error.value = failure.message || '头像生成失败，请重试';
  } finally {
    if (alive) encoding.value = false;
  }
}
</script>

<template>
  <ElDialog
    :model-value="true"
    append-to-body
    :z-index="12000"
    title="裁剪头像"
    align-center
    style="max-height: calc(100dvh - 32px); overflow-y: auto"
    width="min(94vw, 580px)"
    class="avatar-crop-dialog"
    :close-on-click-modal="false"
    :close-on-press-escape="!encoding"
    :show-close="!encoding"
    :before-close="cancel"
    @opened="draw"
  >
    <p id="avatar-crop-help">
      固定1:1方形选框。拖动图片调整位置，也可聚焦预览后用键盘方向键微调。
    </p>
    <p v-if="!ready && !error" role="status">图片读取中…</p>
    <canvas
      v-show="ready"
      ref="canvas"
      width="640"
      height="560"
      tabindex="0"
      role="img"
      aria-label="头像方形裁剪预览"
      aria-describedby="avatar-crop-help"
      @pointerdown="start"
      @pointermove="drag"
      @pointerup="pointer = null"
      @pointercancel="pointer = null"
      @keydown="key"
    />
    <label v-if="ready" class="avatar-crop-zoom"
      >缩放<input
        v-model.number="position.zoom"
        type="range"
        min="1"
        max="4"
        step="0.01"
        :disabled="encoding"
        aria-label="头像缩放倍数"
      /><output>{{ position.zoom.toFixed(2) }}×</output></label
    >
    <div class="avatar-crop-tools">
      <InkButton :disabled="!ready || encoding" @click="rotate"
        >旋转90°</InkButton
      ><InkButton :disabled="!ready || encoding" @click="reset">重置</InkButton>
    </div>
    <p>导出512×512方形头像，最终文件不超过10MB。使用后仍需保存资料。</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <template #footer
      ><InkButton :disabled="encoding" @click="cancel">取消</InkButton
      ><InkButton
        variant="primary"
        :disabled="!ready || encoding"
        @click="accept"
        >{{ encoding ? '生成中…' : '使用此头像' }}</InkButton
      ></template
    >
  </ElDialog>
</template>

<style scoped>
canvas {
  width: 100%;
  height: auto;
  display: block;
  margin: 16px 0;
  touch-action: none;
  cursor: grab;
}
canvas:focus-visible {
  outline: 3px solid var(--ft-color-primary);
  outline-offset: 3px;
}
.avatar-crop-zoom {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
}
.avatar-crop-zoom input {
  min-height: 44px;
  flex: 1;
  min-width: 60px;
}
.avatar-crop-tools {
  display: flex;
  gap: 12px;
  margin: 12px 0;
}
p {
  font-size: 14px;
  line-height: 1.65;
}
[role='alert'] {
  color: var(--ft-color-danger);
}
</style>
