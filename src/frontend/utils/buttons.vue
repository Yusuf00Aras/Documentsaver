<template>
  <button 
    :class="['app-btn', variant, { loading, 'icon-only': iconOnly }]" 
    :disabled="disabled || loading" 
    :title="title"
    :aria-label="title || $slots.default?.[0]?.children"
    :aria-busy="loading"
    @click="!disabled && !loading && $emit('click', $event)"
    @keydown.enter.space="!disabled && !loading && $emit('click', $event)"
  >
    <span v-if="loading" class="spinner"></span>
    <slot v-else />
  </button>
</template>

<script setup>
defineProps({
  variant: { type: String, default: 'primary' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  title: { type: String, default: '' },
  iconOnly: { type: Boolean, default: false }
})
defineEmits(['click'])
</script>

<style scoped>
.app-btn {
  font-family: inherit;
  cursor: pointer;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  outline: none;
  min-height: 40px;
}

.app-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.app-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none !important;
  transform: none !important;
}

.app-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.app-btn:active:not(:disabled) {
  transform: translateY(0);
}

.primary {
  background: var(--accent);
  color: #fff;
  padding: 9px 18px;
  box-shadow: 0 4px 12px rgba(37,99,235,0.28);
}

.primary:hover:not(:disabled) {
  background: var(--accent-hover);
  box-shadow: 0 6px 18px rgba(37,99,235,0.36);
}

.new-chat {
  background: var(--accent);
  color: #fff;
  padding: 10px 12px;
  width: 100%;
  margin-bottom: 14px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(37,99,235,0.22);
}

.new-chat:hover:not(:disabled) {
  background: var(--accent-hover);
  box-shadow: 0 6px 16px rgba(37,99,235,0.30);
}

.upload {
  background: var(--bg-surface);
  color: var(--accent);
  border: 1.5px solid var(--accent-medium);
  padding: 8px 14px;
  font-size: 0.88rem;
}

.upload:hover:not(:disabled) {
  background: var(--accent-light);
  border-color: var(--accent);
}

.danger {
  background: var(--danger);
  color: #fff;
  padding: 9px 16px;
  box-shadow: 0 4px 12px rgba(220,38,38,0.24);
}

.danger:hover:not(:disabled) {
  background: #b91c1c;
  box-shadow: 0 6px 16px rgba(220,38,38,0.32);
}

.cancel {
  background: var(--bg-surface);
  color: var(--text-secondary);
  border: 1.5px solid var(--border);
  padding: 9px 16px;
}

.cancel:hover:not(:disabled) {
  background: var(--bg-surface-2);
  border-color: var(--text-muted);
}

.icon { background: none; padding: 0 4px; font-size: 1rem; opacity: 0; }
.icon:hover { opacity: 1 !important; transform: scale(1.2); }

.logout {
  background: var(--danger-light);
  color: var(--danger);
  padding: 7px 13px;
  font-size: 0.84rem;
  border: 1px solid rgba(220,38,38,0.16);
}

.logout:hover:not(:disabled) {
  background: rgba(220,38,38,0.18);
}

.login {
  width: 100%;
  min-height: 52px;
  background: var(--accent);
  color: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(37,99,235,0.32);
}

.login:hover:not(:disabled) {
  background: var(--accent-hover);
  box-shadow: 0 8px 24px rgba(37,99,235,0.40);
}

.guest {
  width: 100%;
  min-height: 52px;
  background: var(--bg-surface);
  color: var(--accent);
  border: 2px solid var(--accent-medium);
  border-radius: 12px;
}

.guest:hover:not(:disabled) {
  background: var(--accent-light);
  border-color: var(--accent);
}

.icon-visible { background: none; padding: 0 4px; font-size: 1rem; opacity: 0.75; }
.icon-visible:hover { opacity: 1; transform: scale(1.1); }

/* Spinner inside button */
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>