<script setup>
import { useId } from 'vue';
const fieldId = useId();
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
});

defineEmits(['update:modelValue']);
</script>

<template>
  <label class="auth-field">
    <span class="auth-field__label">{{ label }}</span>
    <input
      :id="fieldId"
      class="auth-field__input"
      :class="{ 'is-invalid': error }"
      :type="type"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :value="modelValue"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? `${fieldId}-error` : undefined"
      @input="$emit('update:modelValue', $event.target.value)"
    />
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
