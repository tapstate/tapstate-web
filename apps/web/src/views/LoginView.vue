<script setup lang="ts">
import type { AppLocale } from '@/i18n'
import {
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Terminal,
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { SUPPORTED_LOCALES } from '@/i18n'
import { AuthClientError, login } from '@/services/authClient'
import { useAuthStore } from '@/stores/auth'

type TerminalLineKind = 'command' | 'success'

interface TerminalLine {
  kind: TerminalLineKind
  text: string
}

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const formError = ref<string | null>(null)
const fieldErrors = reactive({ username: null as string | null, password: null as string | null })
const visibleTerminalLines = ref<TerminalLine[]>([])
const terminalLineIndex = ref(0)
const terminalCharacterIndex = ref(0)

let terminalTimer: number | undefined

const terminalLines = computed<TerminalLine[]>(() => [
  { kind: 'command', text: t('auth.login.terminal.connectCommand') },
  { kind: 'success', text: t('auth.login.terminal.connectResult') },
  { kind: 'command', text: t('auth.login.terminal.workspaceCommand') },
  { kind: 'success', text: t('auth.login.terminal.workspaceResult') },
  { kind: 'command', text: t('auth.login.terminal.sourceCommand') },
  { kind: 'success', text: t('auth.login.terminal.sourceResult') },
  { kind: 'command', text: t('auth.login.terminal.pipelineCommand') },
  { kind: 'success', text: t('auth.login.terminal.pipelineResult') },
])

const canSubmit = computed(() => username.value.trim().length > 0 && password.value.length > 0 && !isSubmitting.value)

function switchLocale(nextLocale: AppLocale) {
  locale.value = nextLocale
}

function clearTerminalTimer() {
  if (terminalTimer !== undefined) {
    window.clearTimeout(terminalTimer)
    terminalTimer = undefined
  }
}

function finishTerminalLine(delay: number) {
  terminalLineIndex.value += 1
  terminalCharacterIndex.value = 0
  terminalTimer = window.setTimeout(animateTerminal, delay)
}

function animateTerminal() {
  const line = terminalLines.value[terminalLineIndex.value]
  if (!line)
    return

  if (line.kind !== 'command') {
    visibleTerminalLines.value = [...visibleTerminalLines.value, line]
    finishTerminalLine(420)
    return
  }

  if (terminalCharacterIndex.value === 0)
    visibleTerminalLines.value = [...visibleTerminalLines.value, { ...line, text: '' }]

  terminalCharacterIndex.value += 1
  const nextText = line.text.slice(0, terminalCharacterIndex.value)
  visibleTerminalLines.value = [
    ...visibleTerminalLines.value.slice(0, -1),
    { ...line, text: nextText },
  ]

  if (terminalCharacterIndex.value < line.text.length) {
    terminalTimer = window.setTimeout(animateTerminal, 22)
    return
  }

  finishTerminalLine(260)
}

function startTerminalAnimation() {
  clearTerminalTimer()
  visibleTerminalLines.value = []
  terminalLineIndex.value = 0
  terminalCharacterIndex.value = 0

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion) {
    visibleTerminalLines.value = terminalLines.value
    terminalLineIndex.value = terminalLines.value.length
    return
  }

  terminalTimer = window.setTimeout(animateTerminal, 320)
}

function validate() {
  fieldErrors.username = username.value.trim() ? null : t('auth.validation.usernameRequired')
  fieldErrors.password = password.value ? null : t('auth.validation.passwordRequired')
  return !fieldErrors.username && !fieldErrors.password
}

function errorMessage(error: unknown) {
  if (!(error instanceof AuthClientError))
    return t('auth.login.errors.unknown')

  if (error.kind === 'network')
    return t('auth.login.errors.network')

  if (error.kind === 'protocol')
    return t('auth.login.errors.protocol')

  return error.code === 'control.auth-failed'
    ? t('auth.login.errors.invalidCredentials')
    : t('auth.login.errors.server')
}

async function submit() {
  formError.value = null
  if (!validate())
    return

  isSubmitting.value = true

  try {
    const result = await login({ username: username.value.trim(), password: password.value })
    authStore.setToken(result.token)
    await router.replace({ name: 'sources' })
  }
  catch (error) {
    formError.value = errorMessage(error)
  }
  finally {
    isSubmitting.value = false
  }
}

onMounted(startTerminalAnimation)
onBeforeUnmount(clearTerminalTimer)
</script>

<template>
  <main class="login-page login-page--refined">
    <div class="login-frame">
      <section class="login-auth" aria-labelledby="login-title">
        <header class="login-auth__header">
          <RouterLink class="login-auth__brand" to="/login" :aria-label="t('app.brand')">
            <span class="login-auth__brand-mark" aria-hidden="true"><Terminal :size="14" /></span>
            <span>{{ t('app.brand') }}</span>
          </RouterLink>

          <label class="login-auth__locale">
            <span class="sr-only">{{ t('app.language') }}</span>
            <select :value="locale" :aria-label="t('app.language')" @change="switchLocale(($event.target as HTMLSelectElement).value as AppLocale)">
              <option v-for="option in SUPPORTED_LOCALES" :key="option" :value="option">
                {{ t(`app.languageOptions.${option}`) }}
              </option>
            </select>
          </label>
        </header>

        <div class="login-auth__form-wrap">
          <div class="login-auth__intro">
            <span class="login-auth__eyebrow">{{ t('auth.login.formIndex') }}</span>
            <h1 id="login-title">
              {{ t('auth.login.title') }}
            </h1>
            <p>
              {{ t('auth.login.subtitle') }}
            </p>
          </div>

          <form class="login-form login-form--refined" novalidate @submit.prevent="submit">
            <div class="login-form__field">
              <label for="login-username">{{ t('auth.login.usernameLabel') }}</label>
              <input
                id="login-username"
                v-model="username"
                name="username"
                type="text"
                autocomplete="username"
                :placeholder="t('auth.login.usernamePlaceholder')"
                :aria-invalid="Boolean(fieldErrors.username)"
                aria-describedby="login-username-error"
                @input="fieldErrors.username = null; formError = null"
              >
              <span v-if="fieldErrors.username" id="login-username-error" class="login-form__error">{{ fieldErrors.username }}</span>
            </div>

            <div class="login-form__field">
              <label for="login-password">{{ t('auth.login.passwordLabel') }}</label>
              <div class="login-form__password-wrap">
                <input
                  id="login-password"
                  v-model="password"
                  name="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  :placeholder="t('auth.login.passwordPlaceholder')"
                  :aria-invalid="Boolean(fieldErrors.password)"
                  aria-describedby="login-password-error"
                  @input="fieldErrors.password = null; formError = null"
                >
                <button
                  type="button"
                  class="login-form__icon-button login-form__icon-button--refined"
                  :aria-label="showPassword ? t('auth.login.passwordHide') : t('auth.login.passwordShow')"
                  :title="showPassword ? t('auth.login.passwordHide') : t('auth.login.passwordShow')"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" :size="17" aria-hidden="true" />
                  <Eye v-else :size="17" aria-hidden="true" />
                </button>
              </div>
              <span v-if="fieldErrors.password" id="login-password-error" class="login-form__error">{{ fieldErrors.password }}</span>
            </div>

            <div v-if="formError" class="login-form__alert login-form__alert--refined" role="alert" aria-live="polite">
              <CircleAlert :size="17" aria-hidden="true" />
              <span>{{ formError }}</span>
            </div>

            <button class="login-form__submit login-form__submit--refined" type="submit" :disabled="!canSubmit">
              <span>{{ isSubmitting ? t('auth.login.submitting') : t('auth.login.submit') }}</span>
              <Check v-if="isSubmitting" :size="18" aria-hidden="true" />
              <ArrowRight v-else :size="18" aria-hidden="true" />
            </button>
          </form>

          <p class="login-auth__note">
            {{ t('auth.login.footerNote') }}
          </p>
        </div>
      </section>

      <aside class="login-terminal-panel" :aria-label="t('auth.login.terminal.previewLabel')">
        <div class="login-terminal">
          <header class="login-terminal__bar">
            <div class="login-terminal__lights" aria-hidden="true">
              <span class="login-terminal__light login-terminal__light--red" />
              <span class="login-terminal__light login-terminal__light--yellow" />
              <span class="login-terminal__light login-terminal__light--green" />
            </div>
            <span class="login-terminal__title">{{ t('auth.login.terminal.shell') }}</span>
            <span class="login-terminal__bar-spacer" aria-hidden="true" />
          </header>

          <div class="login-terminal__body" aria-hidden="true">
            <div v-for="(line, index) in visibleTerminalLines" :key="`${index}-${line.kind}`" class="login-terminal__line">
              <span v-if="line.kind === 'command'" class="login-terminal__prompt">{{ t('auth.login.terminal.prompt') }}</span>
              <span v-else class="login-terminal__success">{{ t('auth.login.terminal.successMark') }}</span>
              <span>{{ line.text }}</span>
            </div>
            <div class="login-terminal__cursor-line" aria-hidden="true">
              <span class="login-terminal__prompt">{{ t('auth.login.terminal.prompt') }}</span>
              <span class="login-terminal__cursor" />
            </div>
          </div>

          <footer class="login-terminal__footer">
            <strong>{{ t('auth.login.terminal.footerTitle') }}</strong>
            <span>{{ t('auth.login.terminal.footerBody') }}</span>
          </footer>
        </div>
      </aside>
    </div>
  </main>
</template>
