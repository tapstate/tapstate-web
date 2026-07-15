<script setup lang="ts">
import type { AppLocale } from '@/i18n'
import { ArrowRight, CircleAlert, Eye, EyeOff, LoaderCircle } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { SUPPORTED_LOCALES } from '@/i18n'
import { AuthClientError, login } from '@/services/authClient'
import { useAuthStore } from '@/stores/auth'

interface TerminalLine {
  type: 'command' | 'success' | 'typing'
  text: string
}

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const visibleLines = ref<TerminalLine[]>([])
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const formError = ref<string | null>(null)
const fieldErrors = reactive({ username: null as string | null, password: null as string | null })
const terminalTimers = new Set<number>()
let terminalCancelled = false

const sequence = computed<TerminalLine[]>(() => [
  { text: t('auth.login.terminal.connectCommand'), type: 'command' },
  { text: t('auth.login.terminal.connectResult'), type: 'success' },
  { text: t('auth.login.terminal.workspaceCommand'), type: 'command' },
  { text: t('auth.login.terminal.workspaceResult'), type: 'success' },
  { text: t('auth.login.terminal.sourceCommand'), type: 'command' },
  { text: t('auth.login.terminal.sourceResult'), type: 'success' },
  { text: t('auth.login.terminal.pipelineCommand'), type: 'command' },
  { text: t('auth.login.terminal.pipelineResult'), type: 'success' },
])

const canSubmit = computed(() => username.value.trim().length > 0 && password.value.length > 0 && !isSubmitting.value)

function switchLocale(nextLocale: AppLocale) {
  locale.value = nextLocale
}

function localeBadge(nextLocale: AppLocale) {
  if (nextLocale === 'en')
    return 'EN'
  if (nextLocale === 'zh-CN')
    return '简'
  return '繁'
}

function clearFormErrors() {
  fieldErrors.username = null
  fieldErrors.password = null
  formError.value = null
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

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    const timer = window.setTimeout(() => {
      terminalTimers.delete(timer)
      resolve()
    }, ms)
    terminalTimers.add(timer)
  })
}

function clearTerminalTimers() {
  for (const timer of terminalTimers)
    window.clearTimeout(timer)
  terminalTimers.clear()
}

async function startTerminalAnimation() {
  visibleLines.value = []

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    visibleLines.value = sequence.value
    return
  }

  for (const step of sequence.value) {
    if (terminalCancelled)
      return

    if (step.type === 'command') {
      const lineIndex = visibleLines.value.length
      visibleLines.value.push({ type: 'typing', text: '' })

      for (const char of step.text.split('')) {
        await sleep(32)
        if (terminalCancelled)
          return
        visibleLines.value[lineIndex].text += char
      }

      await sleep(240)
      visibleLines.value[lineIndex].type = 'command'
      await sleep(360)
    }
    else if (step.type === 'success') {
      visibleLines.value.push(step)
      await sleep(700)
    }
  }

  visibleLines.value.push({ type: 'typing', text: '' })
}

onMounted(() => {
  void startTerminalAnimation()
})

onBeforeUnmount(() => {
  terminalCancelled = true
  clearTerminalTimers()
})
</script>

<template>
  <main class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#F9FAFB] p-6 font-sans" aria-labelledby="login-title">
    <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div class="absolute top-[-10%] right-[0%] w-[60%] h-[70%] bg-gradient-to-bl from-indigo-300/40 via-purple-200/30 to-transparent rounded-full blur-[140px] opacity-80 animate-pulse" style="animation-duration: 8s;" />
      <div class="absolute bottom-[-10%] left-[-5%] w-[60%] h-[70%] bg-gradient-to-tr from-sky-300/40 via-emerald-200/30 to-transparent rounded-full blur-[120px] opacity-70 animate-pulse" style="animation-duration: 12s; animation-delay: 2s;" />
    </div>

    <div class="absolute right-6 top-6 z-20 flex items-center rounded-xl border border-white/70 bg-white/70 p-1 shadow-sm backdrop-blur-xl" role="group" :aria-label="t('app.language')">
      <button
        v-for="option in SUPPORTED_LOCALES"
        :key="option"
        type="button"
        class="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[11px] font-semibold text-gray-500 transition-colors hover:bg-white hover:text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
        :class="locale === option ? 'bg-gray-900 text-white shadow-sm hover:bg-gray-900 hover:text-white' : ''"
        :aria-label="t(`app.languageOptions.${option}`)"
        :aria-pressed="locale === option"
        @click="switchLocale(option)"
      >
        {{ localeBadge(option) }}
      </button>
    </div>

    <div class="relative z-10 w-full max-w-[1000px] flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
      <div class="w-full lg:w-[420px] bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.06)] p-10 flex flex-col shrink-0 relative overflow-hidden ring-1 ring-black/[0.02]">
        <div class="absolute inset-0 border border-white/40 rounded-[2rem] pointer-events-none" />

        <div class="relative z-10">
          <div class="mb-10 flex items-center gap-2">
            <div class="flex items-center gap-2">
              <div class="h-6 w-6 bg-gray-900 rounded-[4px] flex items-center justify-center">
                <span class="text-white text-[11px] font-bold leading-none select-none">{{ t('app.brand').slice(0, 1) }}</span>
              </div>
              <span class="font-medium text-[15px] tracking-tight">{{ t('app.brand') }}</span>
            </div>
          </div>

          <div class="w-full mx-auto">
            <h1 id="login-title" class="text-[28px] font-semibold tracking-tight text-gray-900 mb-2">
              {{ t('auth.login.title') }}
            </h1>
            <p class="mb-8 text-[14px] leading-6 text-gray-500">
              {{ t('auth.login.subtitle') }}
            </p>

            <form class="space-y-5" novalidate @submit.prevent="submit">
              <div class="space-y-1.5">
                <label for="login-username" class="text-[13px] font-medium text-gray-700 block">{{ t('auth.login.usernameLabel') }}</label>
                <input
                  id="login-username"
                  v-model="username"
                  name="username"
                  type="text"
                  autocomplete="username"
                  :placeholder="t('auth.login.usernamePlaceholder')"
                  class="w-full h-10 px-3 bg-white/60 border border-gray-200/80 rounded-lg text-[14px] focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all placeholder:text-gray-400 backdrop-blur-sm"
                  :aria-invalid="Boolean(fieldErrors.username)"
                  aria-describedby="login-username-error"
                  :disabled="isSubmitting"
                  @input="clearFormErrors"
                >
                <span v-if="fieldErrors.username" id="login-username-error" class="block text-[12px] leading-5 text-red-600">{{ fieldErrors.username }}</span>
              </div>
              <div class="space-y-1.5">
                <div class="flex justify-between items-center">
                  <label for="login-password" class="text-[13px] font-medium text-gray-700 block">{{ t('auth.login.passwordLabel') }}</label>
                </div>
                <div class="relative">
                  <input
                    id="login-password"
                    v-model="password"
                    name="password"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="current-password"
                    :placeholder="t('auth.login.passwordPlaceholder')"
                    class="w-full h-10 px-3 pr-10 bg-white/60 border border-gray-200/80 rounded-lg text-[14px] focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all placeholder:text-gray-400 backdrop-blur-sm"
                    :class="{ 'tracking-widest font-mono': !showPassword }"
                    :aria-invalid="Boolean(fieldErrors.password)"
                    aria-describedby="login-password-error"
                    :disabled="isSubmitting"
                    @input="clearFormErrors"
                  >
                  <button
                    type="button"
                    class="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400"
                    :aria-label="showPassword ? t('auth.login.passwordHide') : t('auth.login.passwordShow')"
                    :title="showPassword ? t('auth.login.passwordHide') : t('auth.login.passwordShow')"
                    :disabled="isSubmitting"
                    @click="showPassword = !showPassword"
                  >
                    <EyeOff v-if="showPassword" :size="16" aria-hidden="true" />
                    <Eye v-else :size="16" aria-hidden="true" />
                  </button>
                </div>
                <span v-if="fieldErrors.password" id="login-password-error" class="block text-[12px] leading-5 text-red-600">{{ fieldErrors.password }}</span>
              </div>

              <div v-if="formError" class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] leading-5 text-red-700" role="alert" aria-live="polite">
                <CircleAlert :size="16" class="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{{ formError }}</span>
              </div>

              <button
                type="submit"
                class="group mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                :disabled="!canSubmit"
              >
                <span>{{ isSubmitting ? t('auth.login.submitting') : t('auth.login.submit') }}</span>
                <LoaderCircle v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin opacity-80" aria-hidden="true" />
                <ArrowRight v-else class="h-3.5 w-3.5 opacity-70 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
              </button>
            </form>

            <div class="mt-8 flex items-center justify-center gap-4 before:flex-1 before:h-[1px] before:bg-gray-200/50 after:flex-1 after:h-[1px] after:bg-gray-200/50">
              <span class="text-[11px] text-gray-400 uppercase tracking-widest font-medium">Or</span>
            </div>

            <div class="mt-8 flex gap-3">
              <button class="flex-1 h-10 bg-white/60 backdrop-blur-sm border border-gray-200/80 hover:bg-white/90 rounded-lg flex items-center justify-center transition-colors shadow-sm text-gray-700">
                <svg class="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              </button>
              <button class="flex-1 h-10 bg-white/60 backdrop-blur-sm border border-gray-200/80 hover:bg-white/90 rounded-lg flex items-center justify-center transition-colors shadow-sm text-gray-700">
                <svg class="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <aside class="hidden lg:flex relative w-full max-w-[500px] bg-[#0A0A0A]/95 backdrop-blur-xl rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.25)] overflow-hidden flex-col ring-1 ring-white/10 font-mono rotate-1 hover:rotate-0 transition-transform duration-500 hover:shadow-[0_40px_80px_rgba(0,0,0,0.3)]" :aria-label="t('auth.login.terminal.previewLabel')">
        <div class="h-10 bg-white/5 border-b border-white/10 flex items-center px-4 gap-2">
          <div class="flex gap-1.5">
            <div class="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/10" />
            <div class="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/10" />
            <div class="w-3 h-3 rounded-full bg-[#27C93F] border border-black/10" />
          </div>
          <div class="flex-1 text-center text-[12px] text-gray-400 font-sans tracking-wide">
            {{ t('auth.login.terminal.previewLabel') }}
          </div>
        </div>

        <div class="p-6 text-[13px] leading-relaxed text-gray-300 min-h-[300px]" aria-hidden="true">
          <div v-for="(line, index) in visibleLines" :key="index" class="mb-2 flex items-start">
            <template v-if="line.type === 'command'">
              <span class="text-purple-400 mr-2 shrink-0">{{ t('auth.login.terminal.prompt') }}</span>
              <span class="text-white">{{ line.text }}</span>
            </template>
            <template v-else-if="line.type === 'success'">
              <span class="text-emerald-400 mr-2 shrink-0">{{ t('auth.login.terminal.successMark') }}</span>
              <span class="text-gray-400">{{ line.text }}</span>
            </template>
            <template v-else-if="line.type === 'typing'">
              <span class="text-purple-400 mr-2 shrink-0">{{ t('auth.login.terminal.prompt') }}</span>
              <span class="text-white">{{ line.text }}</span><span class="w-2 h-4 bg-white/80 inline-block ml-0.5 align-middle animate-pulse" />
            </template>
          </div>
        </div>

        <div class="px-6 py-5 bg-white/5 border-t border-white/10 mt-auto backdrop-blur-md">
          <p class="text-[14px] font-medium text-white tracking-tight font-sans">
            {{ t('auth.login.terminal.footerTitle') }}
          </p>
          <p class="text-[12px] text-gray-400 mt-1 font-sans">
            {{ t('auth.login.terminal.footerBody') }}
          </p>
        </div>
      </aside>
    </div>
  </main>
</template>
