<script setup>
import { ref, useId } from 'vue';
const fieldId = useId();
const revealed = ref(false);
/**
 * 鉴权表单字段：标签 + 输入框 + 校验错误。受控组件，错误文案由父级传入。
 */
defineProps({
  label: { type: String, required: true },
  modelValue: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  autocomplete: { type: String, default: 'off' },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  inputmode: { type: String, default: undefined },
  maxlength: { type: Number, default: undefined },
});

defineEmits(['update:modelValue']);
</script>

<template>
  <label class="auth-field">
    <span class="auth-field__label">{{ label }}</span>
    <div class="auth-field__control">
      <input
        :id="fieldId"
        class="auth-field__input"
        :class="{ 'is-invalid': error }"
        :type="type === 'password' && revealed ? 'text' : type"
        :disabled="disabled"
        :inputmode="inputmode"
        :maxlength="maxlength"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :value="modelValue"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? `${fieldId}-error` : undefined"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <button
        v-if="type === 'password'"
        type="button"
        class="auth-field__reveal"
        :disabled="disabled"
        :aria-label="`${revealed ? '隐藏' : '显示'}${label}`"
        @click.prevent="revealed = !revealed"
      >
        {{ revealed ? '隐藏' : '显示' }}
      </button>
    </div>
    <span
      v-if="error"
      :id="`${fieldId}-error`"
      class="auth-field__error"
      role="alert"
      >{{ error }}</span
    >
  </label>
</template>

<style scoped lang="scss">
.auth-field {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);
  &__control {
    position: relative;
  }
  &__input {
    width: 100%;
  }
  &__control:has(.auth-field__reveal) input {
    padding-right: 64px;
  }
  &__reveal {
    position: absolute;
    right: 2px;
    top: 1px;
    min-width: 56px;
    min-height: 44px;
    border: 0;
    background: transparent;
    color: var(--ft-color-primary);
    cursor: pointer;
  }

  &__label {
    color: var(--ft-color-text-muted);
    font-size: var(--ft-font-size-sm);
    font-weight: 700;
  }

  &__input {
    min-height: 46px;
    padding: 10px var(--ft-space-2);
    border: 1px solid var(--ft-color-secondary);
    border-radius: 0;
    background: var(--zine-paper-card);
    box-shadow: 2px 2px 0 rgb(58 36 24 / 18%);

    &:focus {
      border-color: var(--ft-color-primary);
      box-shadow: 3px 3px 0 rgb(183 47 28 / 20%);
      outline: none;
    }

    &.is-invalid {
      border-color: var(--ft-color-danger);
      box-shadow: 2px 2px 0 var(--ft-color-danger);
    }
  }

  &__error {
    font-size: 14px;
    color: var(--ft-color-danger);
  }
}
</style>
