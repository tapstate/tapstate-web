import { useState } from 'react'

interface ConnectorIconProps {
  connectorId: string
  name: string
  iconPath?: string | null
  size?: number
  className?: string
}

function monogram(name: string) {
  const first = name.trim().slice(0, 1)
  return first ? first.toUpperCase() : '?'
}

/** Projects a registered connector icon as a direct image with a restrained monogram fallback. */
export function ConnectorIcon({
  connectorId,
  name,
  iconPath,
  size = 36,
  className,
}: ConnectorIconProps) {
  const [failed, setFailed] = useState(false)
  const src = iconPath
    ? iconPath.startsWith('http://') || iconPath.startsWith('https://')
      ? iconPath
      : '/connector-icons/' + encodeURIComponent(connectorId)
    : null

  return (
    <span
      className={
        'connector-icon relative isolate block shrink-0 overflow-hidden' +
        (className ? ' ' + className : '')
      }
      style={{ width: size, height: size }}
      data-fallback={src === null || failed ? monogram(name) : undefined}
      aria-hidden="true"
    >
      {src !== null && !failed && (
        <img
          className="connector-icon__image"
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}
