/** Only internal workbench paths are valid after a fresh authentication boundary. */
export function safeLoginReturn(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^\/(overview|sources|pipelines|views|settings)(?:[/?#]|$)/.test(value) ||
    value.includes('\\') ||
    Array.from(value).some((character) => character.charCodeAt(0) <= 32)
  )
    return '/overview'
  return value
}
