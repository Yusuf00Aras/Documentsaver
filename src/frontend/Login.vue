<template>
  <div class="login-wrapper">
    <div class="login-ambient login-ambient-left"></div>
    <div class="login-ambient login-ambient-right"></div>
    <div class="login-card">
      <div class="login-header">
        <span class="login-kicker">Personal document assistant</span>
        <span class="login-icon">📄</span>
        <h1>Dokumentenretter</h1>
        <p class="login-subtitle">Sign in to manage your documents, chats and analyses in a clean workspace.</p>
      </div>

      <div v-if="errorMsg" class="error-banner">
        {{ errorMsg }}
      </div>

      <div class="form-group">
        <label for="email">
          Email
          <span v-if="!emailValid && email" class="error-text">✗ Invalid format</span>
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          placeholder="name@example.com"
          :disabled="isLoading"
          :aria-invalid="!emailValid && email ? 'true' : 'false'"
          @keyup.enter="canSubmit && handleLogin"
        />
      </div>

      <div class="form-group">
        <label for="password">
          Password
          <span v-if="!passwordValid && password" class="error-text">✗ Min. 6 characters</span>
        </label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="Enter password"
          :disabled="isLoading"
          :aria-invalid="!passwordValid && password ? 'true' : 'false'"
          @keyup.enter="canSubmit && handleLogin"
        />
      </div>

      <Buttons
        variant="login"
        class="action-btn"
        :disabled="!canSubmit"
        :loading="isLoading"
        :title="!emailValid ? 'Valid email required' : !passwordValid ? 'Password min. 6 characters' : ''"
        @click="handleLogin"
      >
        {{ isLoading ? 'Signing in…' : 'Sign in' }}
      </Buttons>
      <Buttons
        variant="guest"
        class="action-btn"
        @click="handleGuestLogin"
      >
        {{ isLoading ? 'Guest access…' : 'Try as guest' }}
      </Buttons>

      <div class="login-note">
        Quick start for demos, tests and short PDF questions without a fixed account.
      </div>

      <p class="register-link">
        No account yet?
        <span class="link" @click="$emit('show-register')">Sign up</span>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Buttons from './utils/buttons.vue'
import { loginUser, loginGuest } from './utils/apicalls.js'

const emit = defineEmits(['login-success', 'show-register'])

const email = ref('')
const password = ref('')
const errorMsg = ref('')
const isLoading = ref(false)

// Validation
const emailValid = computed(() => {
  if (!email.value) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
})

const passwordValid = computed(() => password.value.length >= 6)

const canSubmit = computed(() => emailValid.value && passwordValid.value && !isLoading.value)

async function handleLogin() {
  if (!canSubmit.value) return

  errorMsg.value = ''
  isLoading.value = true

  try {
    const data = await loginUser(email.value.trim(), password.value)

    emit('login-success', {
      accessToken: data.accessToken,
      user: data.user
    })
  } catch (err) {
    console.error('Login error:', err)
    errorMsg.value = err.message || 'Server error – please try again later'
  } finally {
    isLoading.value = false
  }
}

async function handleGuestLogin() {
  if (isLoading.value) return

  errorMsg.value = ''
  isLoading.value = true

  try {
    const data = await loginGuest()

    emit('login-success', {
      accessToken: data.accessToken,
      user: data.user
    })
  } catch (err) {
    console.error('Guest login error:', err)
    errorMsg.value = err.message || 'Server error – please try again later'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  background: var(--bg-base);
  font-family: 'Trebuchet MS', 'Segoe UI', sans-serif;
  padding: 16px;
}

.login-ambient {
  position: absolute;
  width: 480px;
  height: 480px;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  pointer-events: none;
}

.login-ambient-left {
  top: -160px;
  left: -100px;
  background: radial-gradient(circle, rgba(37,99,235,0.45), transparent 70%);
}

.login-ambient-right {
  right: -120px;
  bottom: -160px;
  background: radial-gradient(circle, rgba(59,130,246,0.35), transparent 70%);
}

.login-card {
  position: relative;
  z-index: 1;
  background: var(--bg-surface);
  border-radius: 24px;
  padding: 42px 38px;
  width: 100%;
  max-width: 440px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-kicker {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--accent-light);
  color: var(--accent);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.login-icon {
  font-size: 2.6rem;
  display: block;
  margin-bottom: 10px;
}

.login-header h1 {
  margin: 0;
  font-size: 1.9rem;
  color: var(--text-primary);
  font-weight: 800;
}

.login-subtitle {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: 0.97rem;
  line-height: 1.55;
}

.error-banner {
  background: var(--danger-light);
  color: var(--danger);
  border: 1px solid rgba(220,38,38,0.2);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 0.9rem;
  margin-bottom: 18px;
  text-align: center;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 8px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.error-text {
  color: var(--danger);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: none;
  letter-spacing: normal;
}

.form-group input {
  width: 100%;
  padding: 13px 16px;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
  box-sizing: border-box;
  font-family: inherit;
  background: var(--bg-surface-2);
  color: var(--text-primary);
}

.form-group input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-medium);
  background: var(--bg-surface);
}

.form-group input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action-btn + .action-btn {
  margin-top: 12px;
}

.login-note {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--accent-light);
  color: var(--accent-hover);
  font-size: 0.9rem;
  line-height: 1.5;
  border: 1px solid var(--accent-medium);
}

.register-link {
  text-align: center;
  margin-top: 22px;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.link {
  color: var(--accent);
  cursor: pointer;
  font-weight: 700;
}

.link:hover {
  text-decoration: underline;
  color: var(--accent-hover);
}

@media (max-width: 640px) {
  .login-card {
    padding: 30px 20px;
    border-radius: 20px;
  }

  .login-header h1 {
    font-size: 1.65rem;
  }
}
</style>