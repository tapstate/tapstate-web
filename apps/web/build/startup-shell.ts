interface StartupCopy {
  title: string
  help: string
}

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  )

/** A read-only first paint, replaced by React; it never infers setup or authentication state. */
export function startupShell(copy: StartupCopy) {
  return {
    name: 'tapstate-document-startup',
    transformIndexHtml: {
      order: 'pre' as const,
      handler: (html: string) =>
        html
          .replace(
            '<div id="root"></div>',
            `<div id="root"><main class="tapstate-startup"><strong>Tapstate</strong><section role="status" aria-live="polite"><h1>${escape(copy.title)}</h1><p>${escape(copy.help)}</p></section></main></div>`,
          )
          .replace(
            '</head>',
            `<style>
body:has(.tapstate-startup){margin:0}
.tapstate-startup{box-sizing:border-box;min-height:100vh;padding:32px 16px;background:#fff;color:#171717;font:16px system-ui,sans-serif}
.tapstate-startup>strong,.tapstate-startup>section{display:block;max-width:768px;margin:0 auto}
.tapstate-startup>section{box-sizing:border-box;margin-top:24px;border:1px solid #e5e5e5;border-radius:12px;padding:24px}
.tapstate-startup h1{margin:0;font-size:20px;font-weight:600;line-height:1.5}
.tapstate-startup p{color:#737373;font-size:14px;line-height:1.6;margin:12px 0 20px}
@media(min-width:640px){.tapstate-startup{padding:32px}}
@media(prefers-color-scheme:dark){html:not([data-theme=light]) .tapstate-startup{background:#171717;color:#fafafa}html:not([data-theme=light]) .tapstate-startup>section{border-color:#404040}html:not([data-theme=light]) .tapstate-startup p{color:#a3a3a3}}
html[data-theme=dark] .tapstate-startup{background:#171717;color:#fafafa}html[data-theme=dark] .tapstate-startup>section{border-color:#404040}html[data-theme=dark] .tapstate-startup p{color:#a3a3a3}
</style></head>`,
          ),
    },
  }
}
