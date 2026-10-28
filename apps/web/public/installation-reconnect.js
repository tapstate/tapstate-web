/* A navigation-only reconnect page. No API responses, credentials, or application data are cached. */
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()))
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

const copy = {
  en: [
    'Restarting Tapstate',
    'Reconnecting automatically. You do not need to refresh or submit again.',
    'The service is taking longer to reconnect. Keep this page open or retry.',
    'Retry now',
  ],
  'zh-CN': [
    '正在重启 Tapstate',
    '正在自动重新连接，无需刷新或重复提交。',
    '服务重新连接耗时较长，可以继续等待或重试。',
    '立即重试',
  ],
  'zh-TW': [
    '正在重新啟動 Tapstate',
    '正在自動重新連線，無需重新整理或重複提交。',
    '服務重新連線耗時較長，可以繼續等待或重試。',
    '立即重試',
  ],
}

function waitingPage() {
  const language = new URL(self.location.href).searchParams.get('lang') || 'en'
  const key = language.toLowerCase().startsWith('zh')
    ? /tw|hk|hant/i.test(language)
      ? 'zh-TW'
      : 'zh-CN'
    : 'en'
  const text = copy[key]
  const nonce = crypto.randomUUID().replaceAll('-', '')
  return new Response(
    `<!doctype html><html lang="${key}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tapstate</title>
<style nonce="${nonce}">body{margin:0;background:#fff;color:#171717;font:16px system-ui,sans-serif}main{max-width:760px;margin:64px auto;padding:24px}h1{font-size:24px}section{border:1px solid #e5e5e5;border-radius:12px;padding:28px;margin-top:32px}p{color:#737373;line-height:1.6}.spinner{display:inline-block;width:20px;height:20px;margin-right:12px;border:2px solid #ddd;border-top-color:#171717;border-radius:50%;vertical-align:middle;animation:spin 1s linear infinite}button{background:#fff;border:1px solid #ddd;border-radius:8px;padding:10px 16px;font:inherit;cursor:pointer}@keyframes spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.spinner{animation:none}}</style>
<main><strong>Tapstate</strong><section><h1 role="status"><span class="spinner" aria-hidden="true"></span>${text[0]}</h1><p id="detail">${text[1]}</p><button id="retry" hidden>${text[3]}</button></section></main>
<script nonce="${nonce}">const started=Date.now();let timer;const retry=document.getElementById('retry');async function reconnect(){clearTimeout(timer);try{const response=await fetch('/auth/storage-entry',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(4000)});if(response.ok){const entry=await response.json();if(entry.mode==='OP'&&entry.management&&(entry.initializationProgress?.state==='FAILED'||!['UNAVAILABLE','RESTART_REQUIRED'].includes(entry.entry))){location.replace('/overview');return}}else if(response.status<500){location.replace('/overview');return}}catch{}const slow=Date.now()-started>180000;if(slow){document.getElementById('detail').textContent="__LONG_TEXT__";retry.hidden=false}timer=setTimeout(reconnect,slow?10000:1500)}retry.onclick=reconnect;reconnect()</script></html>`.replace(
      '"__LONG_TEXT__"',
      JSON.stringify(text[2]),
    ),
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`,
      },
    },
  )
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (
    url.origin === self.location.origin &&
    request.destination === 'script' &&
    url.pathname.startsWith('/assets/')
  ) {
    const reconnect = () =>
      new Response("location.replace('/installation-wait')", {
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      })
    event.respondWith(
      fetch(request)
        .then((response) => (response.status >= 500 ? reconnect() : response))
        .catch(reconnect),
    )
    return
  }
  if (
    request.mode === 'navigate' &&
    url.origin === self.location.origin &&
    url.pathname === '/installation-wait'
  ) {
    event.respondWith(Promise.resolve(waitingPage()))
    return
  }
  if (
    request.mode !== 'navigate' ||
    url.origin !== self.location.origin ||
    !['/', '/overview'].includes(url.pathname)
  )
    return
  event.respondWith(
    fetch(request)
      .then((response) => (response.status >= 500 ? waitingPage() : response))
      .catch(() => waitingPage()),
  )
})
