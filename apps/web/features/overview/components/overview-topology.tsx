import type { ReactNode } from 'react'

import { Link } from '@tanstack/react-router'
import { Plus, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ConnectorSummary } from '@/service/source-client'

import { ConnectorIcon } from '@/components/connector-icon'
import { cn } from '@/lib/utils'

import type { OverviewModel } from '../overview-model'

import { sourceConnectors, type SourceConnector } from './overview-source-connectors'

const SOURCE_PATHS = [
  'M0 26H18C42 26 62 42 68 65L85 125C91 148 111 165 135 165H178',
  'M0 116H34C48 116 62 122 72 133L79 141C89 152 103 165 118 165H178',
  'M0 206H32C47 206 62 198 72 186L79 177C89 166 103 165 118 165H178',
  'M0 296H18C42 296 62 280 68 257L85 197C91 174 111 165 135 165H178',
] as const

const DESTINATION_PATH = 'M342 165H520'

const MORE_SOURCE: SourceConnector = {
  id: 'more',
  name: 'More Sources',
  engine: 'Multi-Engine',
  tag: '+',
  accentColor: '#4F46E5',
  gradientColors: ['#4F46E5', '#6366F1'],
  icon: null,
}

interface OverviewTopologyProps {
  overview: OverviewModel
  connectors: ConnectorSummary[]
  onAddSources: () => void
  onBuildPipeline: () => void
  children: ReactNode
}

export function OverviewTopology({
  overview,
  connectors,
  onAddSources,
  onBuildPipeline,
  children,
}: OverviewTopologyProps) {
  const { t } = useTranslation()
  const [selectedSourceIdx, setSelectedSourceIdx] = useState(0)
  const [hoveredTooltipIdx, setHoveredTooltipIdx] = useState<number | null>(null)
  const [isStoreHovered, setIsStoreHovered] = useState(false)
  const [pipelineSyncKey, setPipelineSyncKey] = useState(0)
  const sourceSlots = sourceConnectors(overview.sources.all, connectors)
  const activeSourceIdx = Math.min(selectedSourceIdx, sourceSlots.length - 1)
  const activeSource = sourceSlots[activeSourceIdx]
  const leftDash = activeSourceIdx === 0 || activeSourceIdx === 3 ? 13 : 15.5
  const leftBead = activeSourceIdx === 0 || activeSourceIdx === 3 ? 6.5 : 7.8
  const rightDash = 16
  const rightBead = 8

  useEffect(() => {
    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        setPipelineSyncKey((previous) => previous + 1)
      }
    }
    window.addEventListener('focus', handleSync)
    document.addEventListener('visibilitychange', handleSync)
    return () => {
      window.removeEventListener('focus', handleSync)
      document.removeEventListener('visibilitychange', handleSync)
    }
  }, [])

  if (!activeSource) return null

  const streamLabel =
    overview.pipelines.running > 0
      ? t('overview.streamStatus.active', { count: overview.pipelines.running })
      : t('overview.streamStatus.preview', 'Flow preview')
  const sourceCount = t('overview.streamStatus.sources', { count: overview.sources.count })

  return (
    <section
      className="overview-stage relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-8"
      aria-label={t('overview.title')}
    >
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[340px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-indigo-500/8 via-cyan-500/5 to-emerald-500/8 blur-[90px]" />

      <div className="relative z-10 mb-6 text-center">
        <h2 className="text-[20px] leading-snug font-semibold tracking-tight text-slate-800 sm:text-[22px]">
          {t('overview.subtitle')}
        </h2>
      </div>

      <div className="z-20 mb-10 flex w-full max-w-[840px] items-center justify-center px-2 sm:mb-11">
        <div
          className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/95 px-3.5 py-1.5 text-[12px] font-medium text-slate-600 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
          aria-label={t('overview.streamStatus.label') + ': ' + streamLabel + ', ' + sourceCount}
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
          <span>
            {streamLabel}:{' '}
            <strong className="font-semibold text-slate-800">{activeSource.name}</strong> CDC ➔
            Tapstate Pipeline ➔ {t('overview.stateStore.title')}
          </span>
        </div>
      </div>

      <div
        key={'pipeline-stage-' + pipelineSyncKey + '-' + activeSourceIdx}
        className="overview-arena relative mt-2 mb-4 flex min-h-[340px] w-full max-w-[840px] items-center justify-center select-none"
      >
        <div className="relative z-20 h-[330px] w-[52px] shrink-0">
          <div className="pointer-events-none absolute -top-7 right-0 left-0 text-center text-[11px] font-semibold tracking-wider text-slate-400 uppercase select-none">
            Sources
          </div>
          {[...sourceSlots, MORE_SOURCE].map((src, idx) => {
            const isSelected = activeSourceIdx === idx
            const isHovered = hoveredTooltipIdx === idx
            const isMore = idx === sourceSlots.length
            const connected = overview.sources.all.some(
              (source) => source.connector.trim().toLowerCase() === src.id,
            )
            const topY = idx * 90

            return (
              <div
                key={src.id}
                className="absolute left-0 h-[52px] w-[52px] shrink-0"
                style={{ top: String(topY) + 'px', width: 52, height: 52, aspectRatio: '1 / 1' }}
              >
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseEnter={() => {
                    setHoveredTooltipIdx(idx)
                    if (!isMore) setSelectedSourceIdx(idx)
                  }}
                  onMouseLeave={() => setHoveredTooltipIdx(null)}
                  onFocus={() => {
                    setHoveredTooltipIdx(idx)
                    if (!isMore) setSelectedSourceIdx(idx)
                  }}
                  onBlur={() => setHoveredTooltipIdx(null)}
                  onClick={() => {
                    if (isMore) onAddSources()
                    else setSelectedSourceIdx(idx)
                  }}
                  title={isMore ? t('overview.sources.add') : src.name}
                  aria-label={isMore ? t('overview.sources.add') : src.name}
                  aria-pressed={isMore ? undefined : isSelected}
                  style={{ width: 52, height: 52, aspectRatio: '1 / 1' }}
                  className={cn(
                    'relative flex aspect-square h-[52px] w-[52px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-white p-0 transition-all duration-200',
                    'border border-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:border-slate-300 hover:shadow-md',
                  )}
                >
                  {isMore ? (
                    <Plus className="h-5 w-5 stroke-[2.5] text-[#4F46E5]" />
                  ) : src.iconPath ? (
                    <ConnectorIcon
                      connectorId={src.id}
                      name={src.name}
                      iconPath={src.iconPath}
                      size={28}
                    />
                  ) : (
                    src.icon
                  )}
                </motion.button>

                {isHovered && (
                  <div
                    role="tooltip"
                    className="animate-in fade-in zoom-in-95 pointer-events-none absolute top-1/2 left-[calc(100%+14px)] z-40 flex -translate-y-1/2 items-center gap-2 rounded-lg bg-[#1E1B4B] px-3.5 py-1.5 text-[12px] font-medium whitespace-nowrap text-white shadow-xl"
                  >
                    <div className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rotate-45 bg-[#1E1B4B]" />
                    <span>
                      {isMore
                        ? t('overview.sources.add')
                        : connected
                          ? src.name + ' · ' + t('overview.sources.connected', 'Connected')
                          : t('overview.sources.connect', {
                              name: src.name,
                              defaultValue: 'Connect to ' + src.name,
                            })}
                    </span>
                    {isSelected && !isMore && (
                      <span className="text-[10px] font-bold tracking-wider text-indigo-300 uppercase">
                        Active
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="relative shrink-0 overflow-visible" style={{ width: 520, height: 330 }}>
          <svg
            width="520"
            height="330"
            viewBox="0 0 520 330"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="pointer-events-none overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="selectedSourceBeam"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="165"
                x2="178"
                y2="165"
              >
                <stop offset="0%" stopColor={activeSource.gradientColors[0]} />
                <stop offset="60%" stopColor={activeSource.gradientColors[1]} />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
              <linearGradient
                id="streamingAtlasBeam"
                gradientUnits="userSpaceOnUse"
                x1="342"
                y1="165"
                x2="520"
                y2="165"
              >
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="45%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#00ED64" />
              </linearGradient>
              <filter
                id="elevatedGlow"
                filterUnits="userSpaceOnUse"
                x="-50"
                y="0"
                width="620"
                height="330"
              >
                <feGaussianBlur stdDeviation="3.0" />
              </filter>
            </defs>

            {SOURCE_PATHS.map((pathD, idx) =>
              idx === activeSourceIdx ? null : (
                <path
                  key={'inactive-' + idx}
                  d={pathD}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  stroke="#CBD5E1"
                  strokeWidth="1.5"
                  strokeDasharray="4 6"
                  opacity="0.45"
                />
              ),
            )}
            <path
              d={DESTINATION_PATH}
              strokeLinejoin="round"
              strokeLinecap="round"
              stroke="#10B981"
              strokeOpacity="0.25"
              strokeWidth="1.4"
            />
            <path
              d={SOURCE_PATHS[activeSourceIdx]}
              strokeLinejoin="round"
              strokeLinecap="round"
              stroke={activeSource.accentColor}
              strokeOpacity="0.25"
              strokeWidth="1.4"
            />

            <g>
              <g>
                <path
                  d={SOURCE_PATHS[activeSourceIdx]}
                  pathLength="100"
                  stroke="url(#selectedSourceBeam)"
                  strokeOpacity="0.65"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={leftDash + ' 200'}
                  filter="url(#elevatedGlow)"
                  className="overview-flow-motion"
                  style={{ animation: 'pipeline-stage-flow 1.8s linear infinite' }}
                />
                <path
                  d={SOURCE_PATHS[activeSourceIdx]}
                  pathLength="100"
                  stroke="url(#selectedSourceBeam)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeDasharray={leftDash + ' 200'}
                  className="overview-flow-motion"
                  style={{ animation: 'pipeline-stage-flow 1.8s linear infinite' }}
                />
                <path
                  d={SOURCE_PATHS[activeSourceIdx]}
                  pathLength="100"
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeDasharray={leftBead + ' 200'}
                  opacity="0.95"
                  className="overview-flow-motion"
                  style={{ animation: 'pipeline-stage-flow 1.8s linear infinite' }}
                />
              </g>
              <g>
                <path
                  d={DESTINATION_PATH}
                  pathLength="100"
                  stroke="url(#streamingAtlasBeam)"
                  strokeOpacity="0.65"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={rightDash + ' 200'}
                  filter="url(#elevatedGlow)"
                  className="overview-flow-motion"
                  style={{ animation: 'pipeline-stage-flow 1.8s linear infinite' }}
                />
                <path
                  d={DESTINATION_PATH}
                  pathLength="100"
                  stroke="url(#streamingAtlasBeam)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeDasharray={rightDash + ' 200'}
                  className="overview-flow-motion"
                  style={{ animation: 'pipeline-stage-flow 1.8s linear infinite' }}
                />
                <path
                  d={DESTINATION_PATH}
                  pathLength="100"
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeDasharray={rightBead + ' 200'}
                  opacity="0.95"
                  className="overview-flow-motion"
                  style={{ animation: 'pipeline-stage-flow 1.8s linear infinite' }}
                />
              </g>
            </g>

            <g style={{ transformOrigin: '520px 165px' }}>
              <circle
                cx="520"
                cy="165"
                r="2"
                fill="none"
                stroke="#00ED64"
                strokeWidth="1.2"
                className="overview-flow-motion"
                style={{
                  transformOrigin: '520px 165px',
                  animation: 'pipeline-droplet-ripple-1 1.8s ease-out infinite',
                }}
              />
              <circle
                cx="520"
                cy="165"
                r="2"
                fill="none"
                stroke="#10B981"
                strokeWidth="1.0"
                className="overview-flow-motion"
                style={{
                  transformOrigin: '520px 165px',
                  animation: 'pipeline-droplet-ripple-2 1.8s ease-out infinite',
                }}
              />
              <circle
                cx="520"
                cy="165"
                r="2.5"
                fill="#00ED64"
                className="overview-flow-motion"
                style={{
                  transformOrigin: '520px 165px',
                  animation: 'pipeline-droplet-bead 1.8s ease-out infinite',
                }}
              />
            </g>
          </svg>

          <motion.button
            type="button"
            onClick={onBuildPipeline}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title={t('overview.milestones.build')}
            aria-label={t('overview.pipelineHub') + ': ' + t('overview.milestones.build')}
            style={{ position: 'absolute', left: 178, top: 115, width: 164, height: 100 }}
            className="group z-20 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all select-none hover:border-indigo-300 hover:shadow-[0_8px_28px_rgba(79,70,229,0.12)]"
          >
            <div className="relative z-10 flex items-center justify-center">
              <div
                style={{ animation: 'pipeline-reactor-glow 1.8s ease-in-out infinite' }}
                className="overview-flow-motion relative flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100/90 bg-indigo-50/90 shadow-2xs transition-transform"
              >
                <div
                  className="overview-flow-motion"
                  style={{ animation: 'pipeline-reactor-spin 1.8s ease-in-out infinite' }}
                >
                  <Sparkles className="h-4 w-4 stroke-[2.2] text-indigo-600" />
                </div>
              </div>
            </div>
            <div className="relative z-10 flex w-full flex-col items-center text-center">
              <div className="text-[13px] leading-tight font-semibold tracking-tight text-slate-800">
                Tapstate Pipeline
              </div>
              <div className="mt-1 text-[10.5px] leading-none font-medium text-slate-400">
                {t('overview.pipelineHubSubtitle', 'Continuous CDC Sync')}
              </div>
            </div>
          </motion.button>
        </div>

        <div className="relative z-20 h-[330px] w-[52px] shrink-0">
          <div
            className="absolute left-0 h-[52px] w-[52px] shrink-0"
            style={{ top: '139px', width: 52, height: 52, aspectRatio: '1 / 1' }}
            onMouseEnter={() => setIsStoreHovered(true)}
            onMouseLeave={() => setIsStoreHovered(false)}
            onFocus={() => setIsStoreHovered(true)}
            onBlur={() => setIsStoreHovered(false)}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
              <Link
                to="/settings"
                style={{
                  width: 52,
                  height: 52,
                  aspectRatio: '1 / 1',
                  animation: 'pipeline-atlas-scale-pulse 1.8s ease-in-out infinite',
                }}
                className={cn(
                  'overview-flow-motion relative flex aspect-square h-[52px] w-[52px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-white p-0 transition-all duration-200',
                  'border border-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.05)]',
                  overview.stateStore.ready
                    ? 'border-emerald-500/80 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-amber-400 ring-2 ring-amber-400/30',
                )}
                aria-label={t('overview.stateStore.title')}
              >
                <div className="relative z-10 flex items-center justify-center select-none">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-7 w-7"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 2C12 2 6 9.5 6 15C6 18.3137 8.68629 21 12 21C15.3137 21 18 18.3137 18 15C18 9.5 12 2 12 2Z"
                      fill="#00ED64"
                    />
                    <path d="M12 21V9" stroke="#00684A" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
              </Link>
            </motion.div>

            {isStoreHovered && (
              <div
                role="tooltip"
                className="animate-in fade-in zoom-in-95 pointer-events-none absolute top-1/2 right-[calc(100%+14px)] z-40 flex -translate-y-1/2 flex-col gap-0.5 rounded-lg bg-[#1E1B4B] px-3.5 py-2 text-[12px] font-medium whitespace-nowrap text-white shadow-xl"
              >
                <div className="absolute top-1/2 -right-1 h-2 w-2 -translate-y-1/2 rotate-45 bg-[#1E1B4B]" />
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      overview.stateStore.ready ? 'bg-emerald-400' : 'bg-amber-400',
                    )}
                  />
                  <span className="font-semibold">{t('overview.stateStore.title')}</span>
                </div>
                <span className="text-[11px] text-slate-300">
                  {overview.stateStore.ready
                    ? t('overview.stateStore.managed')
                    : t('overview.stateStore.missing')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {children}
    </section>
  )
}
