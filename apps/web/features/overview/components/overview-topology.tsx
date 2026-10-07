import { Link } from '@tanstack/react-router'
import { HardDrive, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ConnectorSummary } from '@/service/source-client'

import { ConnectorIcon } from '@/components/connector-icon'

import type { OverviewModel } from '../overview-model'

const SOURCE_PATHS = [
  'M0 26H18C42 26 62 42 68 65L85 125C91 148 111 165 135 165H178',
  'M0 116H34C48 116 62 122 72 133L79 141C89 152 103 165 118 165H178',
  'M0 206H32C47 206 62 198 72 186L79 177C89 166 103 165 118 165H178',
  'M0 296H18C42 296 62 280 68 257L85 197C91 174 111 165 135 165H178',
] as const

const DESTINATION_PATH = 'M342 165H520'

interface OverviewTopologyProps {
  overview: OverviewModel
  connectors: ConnectorSummary[]
  onAddSources: () => void
  onBuildPipeline: () => void
}

export function OverviewTopology({
  overview,
  connectors,
  onAddSources,
  onBuildPipeline,
}: OverviewTopologyProps) {
  const { t } = useTranslation()
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [hoveredSourceId, setHoveredSourceId] = useState<string | null>(null)
  const connectorsById = new Map(connectors.map((connector) => [connector.id, connector]))
  const sources = overview.sources.preview.slice(0, 3)
  const selectedSourceIndex = Math.max(
    0,
    sources.findIndex((source) => source.id === selectedSourceId),
  )
  const selectedSource = sources[selectedSourceIndex]
  const moreSources = Math.max(0, overview.sources.count - sources.length)
  const streaming = overview.pipelines.running > 0
  const pipelineAction = t(
    overview.setup.done.pipeline ? 'overview.milestones.newPipeline' : 'overview.milestones.build',
  )

  return (
    <section className="overview-stage" aria-label={t('overview.title')}>
      <h2 className="overview-stage__title">{t('overview.subtitle')}</h2>

      <div
        className="overview-stream-status"
        data-active={streaming}
        aria-label={t('overview.streamStatus.label')}
      >
        <span className="overview-stream-status__indicator" aria-hidden="true" />
        <strong>
          {streaming
            ? t('overview.streamStatus.active', { count: overview.pipelines.running })
            : t('overview.streamStatus.none')}
        </strong>
        <span className="overview-stream-status__separator" aria-hidden="true">
          ·
        </span>
        <span>{t('overview.streamStatus.sources', { count: overview.sources.count })}</span>
        <span className="overview-stream-status__separator" aria-hidden="true">
          ·
        </span>
        <span>
          {t('overview.streamStatus.destination', {
            name: overview.stateStore.ready
              ? t('overview.stateStore.managed')
              : t('overview.stateStore.missing'),
          })}
        </span>
        <Link to="/pipelines" className="overview-link">
          {t('overview.streamStatus.open')}
        </Link>
      </div>

      <div className="overview-topology" data-active={streaming}>
        <div className="overview-topology__source-column">
          <h3 className="overview-topology__column-title">{t('overview.sources.title')}</h3>
          {sources.map((source, index) => {
            const connector = connectorsById.get(source.connector)
            const tooltipId = `overview-source-tooltip-${index}`
            return (
              <div
                key={source.id}
                className="overview-topology__source-wrap"
                style={{ top: `${index * 90}px` }}
              >
                <button
                  type="button"
                  className="overview-topology__source"
                  title={`${connector?.name ?? source.connector}: ${source.id}`}
                  aria-label={`${connector?.name ?? source.connector}: ${source.id}`}
                  aria-pressed={selectedSource?.id === source.id}
                  aria-describedby={hoveredSourceId === source.id ? tooltipId : undefined}
                  onMouseEnter={() => {
                    setSelectedSourceId(source.id)
                    setHoveredSourceId(source.id)
                  }}
                  onMouseLeave={() => setHoveredSourceId(null)}
                  onFocus={() => {
                    setSelectedSourceId(source.id)
                    setHoveredSourceId(source.id)
                  }}
                  onBlur={() => setHoveredSourceId(null)}
                  onClick={() => setSelectedSourceId(source.id)}
                >
                  <span className="overview-topology__source-icon">
                    <ConnectorIcon
                      connectorId={source.connector}
                      name={connector?.name ?? source.connector}
                      iconPath={connector?.icon ?? source.connector}
                      size={30}
                    />
                  </span>
                </button>
                {hoveredSourceId === source.id && (
                  <span id={tooltipId} role="tooltip" className="overview-topology__tooltip">
                    {t('overview.sources.tooltip', {
                      connector: connector?.name ?? source.connector,
                      id: source.id,
                    })}
                  </span>
                )}
              </div>
            )
          })}

          {sources.length === 0 ? (
            <button
              type="button"
              className="overview-topology__source overview-topology__source--add"
              style={{ top: '0px' }}
              aria-label={t('overview.sources.add')}
              title={t('overview.sources.add')}
              onMouseEnter={() => setHoveredSourceId('add')}
              onMouseLeave={() => setHoveredSourceId(null)}
              onFocus={() => setHoveredSourceId('add')}
              onBlur={() => setHoveredSourceId(null)}
              onClick={onAddSources}
            >
              <span className="overview-topology__source-icon">
                <Plus aria-hidden="true" />
              </span>
            </button>
          ) : moreSources > 0 ? (
            <Link
              to="/sources"
              className="overview-topology__source overview-topology__source--add"
              style={{ top: '270px' }}
              aria-label={t('overview.sources.more', { count: moreSources })}
              title={t('overview.sources.more', { count: moreSources })}
            >
              <span className="overview-topology__source-icon">
                <span aria-hidden="true">+{moreSources}</span>
              </span>
            </Link>
          ) : (
            <button
              type="button"
              className="overview-topology__source overview-topology__source--add"
              style={{ top: '270px' }}
              aria-label={t('overview.sources.add')}
              title={t('overview.sources.add')}
              onMouseEnter={() => setHoveredSourceId('add')}
              onMouseLeave={() => setHoveredSourceId(null)}
              onFocus={() => setHoveredSourceId('add')}
              onBlur={() => setHoveredSourceId(null)}
              onClick={onAddSources}
            >
              <span className="overview-topology__source-icon">
                <Plus aria-hidden="true" />
              </span>
            </button>
          )}
        </div>

        <div className="overview-topology__network" aria-hidden="true">
          <svg viewBox="0 0 520 330" preserveAspectRatio="none">
            <defs>
              <linearGradient id="overview-stream-gradient" x1="342" y1="165" x2="520" y2="165">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="48%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#00a884" />
              </linearGradient>
              <filter id="overview-stream-glow" x="-20%" y="-100%" width="140%" height="300%">
                <feGaussianBlur stdDeviation="2.5" />
              </filter>
            </defs>
            {SOURCE_PATHS.map((path, index) => (
              <path
                key={path}
                d={path}
                className="overview-topology__source-track"
                data-focused={index === selectedSourceIndex && selectedSource !== undefined}
                style={
                  index === selectedSourceIndex && selectedSource
                    ? { stroke: connectorAccent(selectedSource.connector) }
                    : undefined
                }
              />
            ))}
            <path d={DESTINATION_PATH} className="overview-topology__store-track" />
            {streaming && selectedSource && (
              <>
                <path
                  d={SOURCE_PATHS[selectedSourceIndex]}
                  pathLength={100}
                  className="overview-topology__source-beam"
                  style={{ stroke: connectorAccent(selectedSource.connector) }}
                  filter="url(#overview-stream-glow)"
                />
                <path
                  d={SOURCE_PATHS[selectedSourceIndex]}
                  pathLength={100}
                  className="overview-topology__source-beam overview-topology__source-beam--core"
                  style={{ stroke: connectorAccent(selectedSource.connector) }}
                />
                <path
                  d={DESTINATION_PATH}
                  pathLength={100}
                  className="overview-topology__store-glow"
                  filter="url(#overview-stream-glow)"
                />
                <path
                  d={DESTINATION_PATH}
                  pathLength={100}
                  className="overview-topology__store-beam"
                />
              </>
            )}
          </svg>

          <button
            type="button"
            className="overview-topology__hub"
            data-streaming={streaming}
            aria-label={`${t('overview.pipelineHub')}: ${pipelineAction}`}
            title={pipelineAction}
            onClick={onBuildPipeline}
          >
            <span className="overview-topology__hub-icon">
              <span className="overview-topology__hub-icon-inner">
                <Sparkles aria-hidden="true" />
              </span>
            </span>
            <strong>{t('overview.pipelineHub')}</strong>
            <span className="overview-topology__hub-subtitle">
              {t('overview.pipelineHubSubtitle')}
            </span>
            <span className="overview-topology__hub-count">
              {overview.pipelines.total === 0
                ? t('overview.pipelines.none')
                : t('overview.pipelines.metric', { count: overview.pipelines.total })}
            </span>
            {overview.pipelines.error > 0 && (
              <span
                className="overview-topology__problem-count"
                aria-label={t('overview.pipelines.error')}
              >
                {overview.pipelines.error}
              </span>
            )}
          </button>
        </div>

        <div className="overview-topology__store-column">
          <h3 className="overview-topology__column-title">{t('overview.stateStore.title')}</h3>
          <Link
            to="/settings"
            className="overview-topology__store-node"
            data-ready={overview.stateStore.ready}
            title={t(
              overview.stateStore.ready
                ? 'overview.stateStore.managed'
                : 'overview.stateStore.missing',
            )}
            aria-label={t(
              overview.stateStore.ready
                ? 'overview.stateStore.managed'
                : 'overview.stateStore.missing',
            )}
          >
            <span className="overview-topology__store-icon">
              <HardDrive aria-hidden="true" />
              {overview.stateStore.views?.stale ? (
                <span className="overview-topology__problem-count overview-topology__problem-count--warning">
                  {overview.stateStore.views.stale}
                </span>
              ) : null}
            </span>
            <strong>
              {overview.stateStore.ready
                ? t('overview.stateStore.ready')
                : t('overview.stateStore.missing')}
            </strong>
            {overview.stateStore.views && (
              <span className="overview-topology__store-count">
                {t('overview.stateStore.metric', { count: overview.stateStore.views.total })}
              </span>
            )}
          </Link>
          <Link to="/views" className="overview-link overview-topology__views-link">
            {t('overview.stateStore.openViews')}
          </Link>
        </div>
      </div>
    </section>
  )
}

function connectorAccent(connector: string): string {
  switch (connector.trim().toLowerCase()) {
    case 'mysql':
      return '#00618a'
    case 'postgres':
    case 'postgresql':
      return '#336791'
    case 'oracle':
      return '#dc2626'
    default:
      return '#4f46e5'
  }
}
