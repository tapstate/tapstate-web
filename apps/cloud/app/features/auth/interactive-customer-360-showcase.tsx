import {
  Database,
  FileText,
  GitCommit,
  Layers,
  LayoutGrid,
  Settings,
  Tag,
  User,
} from 'lucide-react'
import { useEffect, useRef, useState, type FC, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Official Tapstate Brand Mark matching the landing artwork
 */
const TapstateBrandLogo: FC<{ size?: 'sm' | 'md' | 'lg'; forceLight?: boolean }> = ({
  size = 'md',
  forceLight = false,
}) => {
  const iconDim =
    size === 'sm'
      ? 'w-6 h-6 rounded-[6px] px-[4px] gap-[2.5px]'
      : size === 'lg'
        ? 'w-9 h-9 rounded-[10px] px-[6px] gap-[3.5px]'
        : 'w-7 h-7 rounded-[8px] px-[5px] gap-[3px]'
  const textDim = size === 'sm' ? 'text-[15px]' : size === 'lg' ? 'text-[22px]' : 'text-[18px]'

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <div
        className={`${iconDim} flex shrink-0 flex-col justify-center border border-white/10 bg-[#091128] shadow-xs`}
      >
        <span className="h-[2.5px] w-[62%] rounded-full bg-[#2563EB]" />
        <span className="h-[2.5px] w-[72%] self-end rounded-full bg-[#00C4C8]" />
        <span className="h-[2.5px] w-[58%] rounded-full bg-[#2563EB]" />
      </div>
      <span className={`${textDim} leading-none font-bold tracking-[-0.03em] whitespace-nowrap`}>
        <span className={forceLight ? 'text-[#091128]' : 'text-[#091128] dark:text-white'}>
          tap
        </span>
        <span className="text-[#00B4B8]">state</span>
      </span>
    </div>
  )
}

/**
 * Interactive 3D-Tilted Reconstruction of the customer-360 Landing Visual
 * Features:
 * 1. Multi-layer 3D optical parallax & cursor-tracked specular glass reflection
 * 2. Auto-cycling + manual hover/click CDC stream tracing with SVG <animateMotion> particles
 * 3. Interactive customer_360 card toggle (Schema View <-> Live Materialized JSON diff)
 * 4. Cross-stage sympathetic resonance with the right-hand Auth Form (live workspace domain & auth handshake)
 */
export const InteractiveCustomer360Showcase: FC<{
  darkMode: boolean
  workspaceDomain?: string
  isAuthenticating?: boolean
}> = ({ darkMode, workspaceDomain, isAuthenticating }) => {
  const { t } = useTranslation()
  const [hoveredSource, setHoveredSource] = useState<'oracle' | 'sqlserver' | 'mongodb' | null>(
    null,
  )
  const [lockedSource, setLockedSource] = useState<'oracle' | 'sqlserver' | 'mongodb' | null>(null)
  const [autoCycleIdx, setAutoCycleIdx] = useState<number>(0)
  const [inspectJson, setInspectJson] = useState<boolean>(false)
  const [burstCount, setBurstCount] = useState<number>(0)

  // 3D Parallax state for the tilted console stage
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [tilt, setTilt] = useState<{ rx: number; ry: number; gx: number; gy: number }>({
    rx: 0,
    ry: 0,
    gx: 50,
    gy: 30,
  })

  const sourceOrder: ('oracle' | 'sqlserver' | 'mongodb')[] = ['oracle', 'sqlserver', 'mongodb']

  // Ambient auto-cycling CDC pulse when user hasn't hovered or locked a source
  useEffect(() => {
    if (hoveredSource || lockedSource) return
    const interval = setInterval(() => {
      setAutoCycleIdx((prev) => (prev + 1) % 3)
    }, 2800)
    return () => clearInterval(interval)
  }, [hoveredSource, lockedSource])

  const activeSource = hoveredSource || lockedSource || sourceOrder[autoCycleIdx]

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width // 0..1
    const y = (e.clientY - rect.top) / rect.height // 0..1
    const ry = (x - 0.5) * 4.5 // -2.25deg .. +2.25deg
    const rx = (0.5 - y) * 3.5 // -1.75deg .. +1.75deg
    setTilt({ rx, ry, gx: Math.round(x * 100), gy: Math.round(y * 100) })
  }

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 30 })
    setHoveredSource(null)
  }

  const triggerEventBurst = () => {
    setBurstCount((c) => c + 1)
    const nextIdx = (sourceOrder.indexOf(activeSource) + 1) % 3
    setLockedSource(sourceOrder[nextIdx])
  }

  const sources = [
    {
      id: 'oracle' as const,
      name: 'Oracle',
      lag: '11ms',
      mutation: 'customers.tier → "Enterprise"',
      fields: ['customers'],
      icon: (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border border-slate-200/80 bg-white shadow-2xs dark:border-white/10 dark:bg-slate-800">
          {/* Official Oracle Brand Mark (O Capsule) */}
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M7.75 6.75H16.25C19.1495 6.75 21.5 9.10051 21.5 12C21.5 14.8995 19.1495 17.25 16.25 17.25H7.75C4.85051 17.25 2.5 14.8995 2.5 12C2.5 9.10051 4.85051 6.75 7.75 6.75ZM7.85 9.35C6.38645 9.35 5.2 10.5364 5.2 12C5.2 13.4636 6.38645 14.65 7.85 14.65H16.15C17.6136 14.65 18.8 13.4636 18.8 12C18.8 10.5364 17.6136 9.35 16.15 9.35H7.85Z"
              fill="#F80000"
            />
          </svg>
        </div>
      ),
    },
    {
      id: 'sqlserver' as const,
      name: 'SQL Server',
      lag: '14ms',
      mutation: 'accounts.arr → $148,500',
      fields: ['accounts', 'transactions'],
      icon: (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border border-slate-200/80 bg-white shadow-2xs dark:border-white/10 dark:bg-slate-800">
          {/* Authentic Microsoft SQL Server Database Engine Icon */}
          <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none">
            <ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" fill="#EE3124" />
            <path
              d="M4.5 5.5v4.2c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8V5.5c0 1.55-3.36 2.8-7.5 2.8S4.5 7.05 4.5 5.5z"
              fill="#D92027"
            />
            <path
              d="M4.5 11.2v4.2c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8v-4.2c0 1.55-3.36 2.8-7.5 2.8s-7.5-1.25-7.5-2.8z"
              fill="#B5121B"
            />
            <path
              d="M4.5 16.8v1.7c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8v-1.7c0 1.55-3.36 2.8-7.5 2.8s-7.5-1.25-7.5-2.8z"
              fill="#8E0B13"
            />
            <ellipse cx="12" cy="5.3" rx="5.6" ry="1.4" fill="#FF7A70" fillOpacity="0.45" />
          </svg>
        </div>
      ),
    },
    {
      id: 'mongodb' as const,
      name: 'MongoDB',
      lag: '7ms',
      mutation: 'support_tickets.sla → "99.98%"',
      fields: ['support_tickets'],
      icon: (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border border-slate-200/80 bg-white shadow-2xs dark:border-white/10 dark:bg-slate-800">
          {/* Official MongoDB Two-Tone Leaf Mark */}
          <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none">
            <path
              d="M12.42 2.15C12.18 1.82 12 1.5 12 1.5C12 1.5 11.82 1.82 11.58 2.15C9.12 5.48 6.75 8.85 6.75 13.05C6.75 16.72 9.04 19.34 11.45 20.25L12 20.45L12.55 20.25C14.96 19.34 17.25 16.72 17.25 13.05C17.25 8.85 14.88 5.48 12.42 2.15Z"
              fill="#10AA50"
            />
            <path
              d="M12 1.5C12 1.5 11.82 1.82 11.58 2.15C9.12 5.48 6.75 8.85 6.75 13.05C6.75 16.72 9.04 19.34 11.45 20.25L12 20.45V1.5Z"
              fill="#13AA52"
            />
            <path
              d="M12 1.5V20.45L12.55 20.25C14.96 19.34 17.25 16.72 17.25 13.05C17.25 8.85 14.88 5.48 12.42 2.15C12.18 1.82 12 1.5 12 1.5Z"
              fill="#00684A"
              fillOpacity="0.35"
            />
            <path d="M11.65 19.8L12 22.5L12.35 19.8H11.65Z" fill="#B8C4C2" />
          </svg>
        </div>
      ),
    },
  ]

  const viewFields = [
    { name: 'customers', source: 'oracle' as const, icon: User, jsonVal: '"Enterprise"' },
    { name: 'accounts', source: 'sqlserver' as const, icon: Database, jsonVal: '$148,500' },
    { name: 'transactions', source: 'sqlserver' as const, icon: FileText, jsonVal: '1,284 tx' },
    { name: 'support_tickets', source: 'mongodb' as const, icon: Tag, jsonVal: '0 open' },
  ]

  const activeSourceObj = sources.find((s) => s.id === activeSource)!

  return (
    <div className="relative flex w-full flex-col justify-between gap-10 py-4 select-none xl:gap-12 xl:py-6 2xl:gap-14">
      {/* Top Brand + Editorial Value Proposition */}
      <div className="relative z-10 max-w-[660px] space-y-6 xl:max-w-[700px] xl:space-y-7">
        <div>
          <TapstateBrandLogo size="lg" />
        </div>

        <div className="space-y-4">
          <h2 className="text-[28px] leading-[1.16] font-bold tracking-[-0.035em] text-[#071026] lg:text-[32px] xl:text-[38px] 2xl:text-[40px] dark:text-white">
            {t('auth.showcase.headlinePrimary')}
            <span className="mt-1.5 block text-[#00B4B8] dark:text-[#00D2D6]">
              {t('auth.showcase.headlineSecondary')}
            </span>
          </h2>
          <p className="max-w-[650px] text-[14px] leading-[1.7] font-normal text-[#334155] xl:max-w-[680px] xl:text-[15px] 2xl:text-[15.5px] dark:text-slate-300">
            {t('auth.showcase.description')}
          </p>
        </div>
      </div>

      {/* Bottom 3D Perspective Console Stage with Optical Mouse Parallax */}
      <div
        ref={stageRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative z-10 w-full max-w-[690px] pt-3 pr-1 pb-5 pl-3 xl:max-w-[720px] 2xl:max-w-[740px]"
        style={{ perspective: '1400px' }}
      >
        {/* Ambient Cyan-Sky Backlight Glow behind the 3D Console */}
        <div
          className="pointer-events-none absolute -inset-4 rounded-[36px] opacity-75 blur-2xl transition-transform duration-300 ease-out dark:opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 75% 70% at 52% 50%, rgba(56, 189, 248, 0.18) 0%, rgba(0, 180, 184, 0.10) 45%, transparent 75%)',
            transform: `translate3d(${tilt.ry * -2.2}px, ${tilt.rx * 2.2}px, 0)`,
          }}
        />

        {/* Frosted Glass Backing Plane 1 (Top-Right Offset Stack - Deep Parallax Layer) */}
        <div
          className="pointer-events-none absolute -top-4 right-1 bottom-4 left-10 rounded-[22px] border border-white/80 bg-white/50 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.05)] backdrop-blur-md transition-transform duration-200 ease-out dark:border-white/[0.07] dark:bg-white/[0.03]"
          style={{
            transform: `rotate(-2.1deg) translate3d(${tilt.ry * -1.8}px, ${tilt.rx * 1.8}px, -20px)`,
          }}
        />

        {/* Frosted Glass Backing Plane 2 + Architectural Dot-Matrix (Bottom-Left Bleed, kept inside bounds) */}
        <div
          className="pointer-events-none absolute top-6 -bottom-4 -left-2.5 w-[240px] overflow-hidden rounded-[24px] border border-white/75 bg-gradient-to-br from-white/55 via-sky-50/35 to-blue-100/25 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.06)] backdrop-blur-md transition-transform duration-200 ease-out dark:border-white/[0.06] dark:from-white/[0.03] dark:to-sky-950/20"
          style={{
            transform: `rotate(-2.1deg) translate3d(${tilt.ry * -2.8}px, ${tilt.rx * 2.8}px, -35px)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-45 dark:opacity-25"
            style={{
              backgroundImage:
                'radial-gradient(rgba(59, 130, 246, 0.38) 1.25px, transparent 1.25px)',
              backgroundSize: '14px 14px',
            }}
          />
        </div>

        {/* Main 3D Tilted Console Window */}
        <div
          className="relative overflow-hidden rounded-[20px] border border-white bg-white/96 shadow-[0_28px_65px_-16px_rgba(15,23,42,0.14),0_8px_24px_-6px_rgba(15,23,42,0.06),0_0_0_1px_rgba(15,23,42,0.04)] transition-transform duration-200 ease-out dark:border-white/[0.11] dark:bg-[#151821]/95 dark:shadow-[0_32px_70px_-16px_rgba(0,0,0,0.75)]"
          style={{
            transform: `rotate(-1.8deg) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          }}
        >
          {/* Cursor-Tracked Specular Glass Sheen */}
          <div
            className="pointer-events-none absolute inset-0 z-30 opacity-60 transition-opacity duration-200 dark:opacity-25"
            style={{
              background: `radial-gradient(380px circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.45), transparent 70%)`,
            }}
          />

          <div className="relative z-10 flex min-h-[372px] xl:min-h-[396px]">
            {/* Left Console Sidebar - Compact fixed width so the 3-column topology has ample room */}
            <div className="flex w-[118px] shrink-0 flex-col justify-between border-r border-slate-200/70 bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9]/70 p-4 xl:w-[132px] xl:p-4.5 dark:border-white/[0.06] dark:from-[#11141D] dark:to-[#0E1118]">
              <div className="space-y-6">
                <div className="px-0.5 pt-0.5">
                  <TapstateBrandLogo size="sm" />
                </div>

                <div className="space-y-1.5 text-[11px] font-medium xl:text-[11.5px]">
                  <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 whitespace-nowrap text-slate-600 dark:text-slate-400">
                    <LayoutGrid className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span>{t('auth.showcase.menu.overview')}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 whitespace-nowrap text-slate-600 dark:text-slate-400">
                    <Database className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span>{t('auth.showcase.menu.sources')}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-[#E6F0FF] px-2.5 py-2 font-semibold whitespace-nowrap text-[#1D4ED8] dark:bg-blue-500/20 dark:text-blue-400">
                    <GitCommit className="h-3.5 w-3.5 shrink-0" />
                    <span>{t('auth.showcase.menu.pipelines')}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 whitespace-nowrap text-slate-600 dark:text-slate-400">
                    <Layers className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span>{t('auth.showcase.menu.views')}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 whitespace-nowrap text-slate-600 dark:text-slate-400">
                    <Settings className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span>{t('auth.showcase.menu.settings')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Pipeline Workspace Canvas */}
            <div className="flex min-w-0 flex-1 flex-col justify-between space-y-5 bg-white p-5 xl:p-6 dark:bg-[#151821]">
              {/* Top Breadcrumb & Header Row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[10.5px] font-medium whitespace-nowrap text-slate-400 dark:text-slate-500">
                    {workspaceDomain && (
                      <>
                        <span className="font-mono font-semibold text-[#00B4B8] dark:text-[#00D2D6]">
                          tapstate.com · {workspaceDomain}
                        </span>
                        <span>›</span>
                      </>
                    )}
                    <span>{t('auth.showcase.menu.pipelines')}</span>
                    <span>›</span>
                    <span>customer-360</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[17px] leading-none font-bold tracking-tight whitespace-nowrap text-[#071026] xl:text-[18px] dark:text-white">
                      customer-360
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-[#15803D] dark:bg-emerald-950/60 dark:text-emerald-400">
                      <span
                        className={`h-1.5 w-1.5 rounded-full bg-[#16A34A] dark:bg-emerald-400 ${
                          isAuthenticating ? 'animate-ping' : ''
                        }`}
                      />
                      {isAuthenticating
                        ? t('auth.showcase.status.handshake')
                        : t('auth.showcase.status.running')}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] whitespace-nowrap text-slate-500 dark:text-slate-400">
                    {t('auth.showcase.workspaceSummary')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={triggerEventBurst}
                  title={t('auth.showcase.actions.createPipelineHint')}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-[#09152E] px-2.5 py-1.5 text-[10px] font-semibold whitespace-nowrap text-white shadow-2xs transition-all hover:bg-[#13254C] active:scale-[0.97] xl:text-[10.5px] dark:bg-white dark:text-[#091128] dark:hover:bg-slate-100"
                >
                  <span>{t('auth.showcase.actions.createPipeline')}</span>
                  <svg
                    className="h-2.5 w-2.5 opacity-70"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* 3-Column Topology with Dedicated Narrow Connector Tracks (Zero text truncation) */}
              <div className="relative grid flex-1 grid-cols-[1.08fr_22px_1.05fr_22px_1.18fr] items-stretch gap-0 pt-1 xl:grid-cols-[1.1fr_26px_1.06fr_26px_1.22fr]">
                {/* COLUMN 1: Sources (3 connected) */}
                <div className="z-10 flex flex-col justify-between space-y-2.5 rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-2.5 xl:p-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
                  <div className="flex items-center justify-between gap-1">
                    <div>
                      <div className="text-[10.5px] leading-tight font-bold whitespace-nowrap text-[#071026] dark:text-white">
                        {t('auth.showcase.sources.title')}
                      </div>
                      <div className="mt-0.5 text-[9px] leading-tight whitespace-nowrap text-slate-400">
                        {t('auth.showcase.sources.connectedCount')}
                      </div>
                    </div>
                    <span className="rounded bg-[#00B4B8]/10 px-1.5 py-0.5 font-mono text-[8.5px] font-semibold whitespace-nowrap text-[#009699] dark:text-[#00D2D6]">
                      {lockedSource ? t('auth.showcase.sources.pinned') : activeSourceObj.lag}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-center space-y-2">
                    {sources.map((src) => {
                      const isCurrent = activeSource === src.id
                      return (
                        <div
                          key={src.id}
                          onMouseEnter={() => setHoveredSource(src.id)}
                          onMouseLeave={() => setHoveredSource(null)}
                          onClick={() =>
                            setLockedSource((prev) => (prev === src.id ? null : src.id))
                          }
                          className={`flex cursor-pointer items-center gap-2 rounded-[10px] border p-2 transition-all duration-150 xl:p-2.5 ${
                            isCurrent
                              ? '-translate-y-[0.5px] border-[#00B4B8] bg-white shadow-[0_4px_12px_-2px_rgba(0,180,184,0.18)] dark:bg-[#1E2433]'
                              : 'border-slate-200/60 bg-white hover:border-slate-300 dark:border-white/[0.06] dark:bg-[#1A1E29]'
                          }`}
                        >
                          {src.icon}
                          <div className="min-w-0">
                            <div className="text-[10.5px] leading-tight font-semibold whitespace-nowrap text-[#071026] dark:text-white">
                              {src.name}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1 text-[9px] font-medium whitespace-nowrap text-slate-500 dark:text-slate-400">
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                  isCurrent ? 'bg-[#00B4B8]' : 'bg-[#10B981]'
                                }`}
                              />
                              <span>{t('auth.showcase.sources.connected')}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* SVG CONNECTOR BRIDGE 1: Sources -> Business view (with Live Traveling Data Packets) */}
                <div className="pointer-events-none relative z-20 -mx-0.5 flex items-center justify-center">
                  <svg
                    className="h-[180px] w-full overflow-visible"
                    viewBox="0 0 36 180"
                    fill="none"
                  >
                    {/* Top Source (Oracle) -> Center */}
                    <path
                      id="cdc-path-oracle"
                      d="M 0 42 C 18 42, 14 96, 32 96"
                      stroke={
                        activeSource === 'oracle' ? '#00B4B8' : darkMode ? '#475569' : '#94A3B8'
                      }
                      strokeWidth={activeSource === 'oracle' ? '1.8' : '1.3'}
                      strokeDasharray="3 2.5"
                    />
                    {/* Middle Source (SQL Server) -> Center */}
                    <path
                      id="cdc-path-sqlserver"
                      d="M 0 96 L 32 96"
                      stroke={
                        activeSource === 'sqlserver' ? '#00B4B8' : darkMode ? '#64748B' : '#64748B'
                      }
                      strokeWidth={activeSource === 'sqlserver' ? '1.8' : '1.3'}
                      strokeDasharray="3 2.5"
                    />
                    {/* Bottom Source (MongoDB) -> Center */}
                    <path
                      id="cdc-path-mongodb"
                      d="M 0 150 C 18 150, 14 96, 32 96"
                      stroke={
                        activeSource === 'mongodb' ? '#00B4B8' : darkMode ? '#475569' : '#94A3B8'
                      }
                      strokeWidth={activeSource === 'mongodb' ? '1.8' : '1.3'}
                      strokeDasharray="3 2.5"
                    />

                    {/* Traveling Glowing CDC Particle along the Active Source Path */}
                    <circle r="2.6" fill="#00B4B8">
                      <animateMotion
                        key={`${activeSource}-${burstCount}`}
                        dur={isAuthenticating ? '0.45s' : '1.25s'}
                        repeatCount="indefinite"
                        path={
                          activeSource === 'oracle'
                            ? 'M 0 42 C 18 42, 14 96, 32 96'
                            : activeSource === 'sqlserver'
                              ? 'M 0 96 L 32 96'
                              : 'M 0 150 C 18 150, 14 96, 32 96'
                        }
                      />
                    </circle>

                    {/* Converging Arrowhead */}
                    <path
                      d="M 28 92.5 L 33.5 96 L 28 99.5"
                      stroke="#00B4B8"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* COLUMN 2: Business view (customer_360) - Clickable to peek Live JSON values */}
                <div className="z-10 flex flex-col justify-between space-y-2.5 rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-2.5 xl:p-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
                  <div className="flex items-center justify-between gap-1">
                    <div>
                      <div className="text-[10.5px] leading-tight font-bold whitespace-nowrap text-[#071026] dark:text-white">
                        {t('auth.showcase.views.title')}
                      </div>
                      <div className="mt-0.5 text-[9px] leading-tight whitespace-nowrap text-slate-400">
                        {t('auth.showcase.views.count')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectJson((v) => !v)}
                      className="shrink-0 cursor-pointer rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[8.5px] text-slate-600 transition-colors hover:text-[#00B4B8] dark:bg-white/10 dark:text-slate-300"
                      title={t('auth.showcase.views.toggleHint')}
                    >
                      {inspectJson
                        ? t('auth.showcase.views.fields')
                        : t('auth.showcase.views.json')}
                    </button>
                  </div>

                  <div
                    onClick={() => setInspectJson((v) => !v)}
                    className="flex flex-1 cursor-pointer flex-col justify-between space-y-2.5 rounded-[10px] border border-slate-200/60 bg-white p-2.5 transition-colors hover:border-[#00B4B8]/50 xl:p-3 dark:border-white/[0.06] dark:bg-[#1A1E29]"
                  >
                    <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 dark:border-white/[0.06]">
                      <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[5px] bg-[#09152E] text-white dark:bg-white/10">
                        <LayoutGrid className="h-2.5 w-2.5" />
                      </div>
                      <span className="text-[10px] font-bold whitespace-nowrap text-[#071026] xl:text-[10.5px] dark:text-white">
                        customer_360
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col justify-center space-y-2 text-[9.5px] xl:text-[10px]">
                      {viewFields.map((field) => {
                        const IconComponent = field.icon
                        const highlighted = activeSource === field.source
                        return (
                          <div
                            key={field.name}
                            onMouseEnter={(e) => {
                              e.stopPropagation()
                              setHoveredSource(field.source)
                            }}
                            onMouseLeave={() => setHoveredSource(null)}
                            className={`flex items-center justify-between gap-1 whitespace-nowrap transition-colors ${
                              highlighted
                                ? 'font-semibold text-[#00B4B8]'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <IconComponent className="h-3 w-3 shrink-0 opacity-65" />
                              <span>{inspectJson ? field.jsonVal : field.name}</span>
                            </div>
                          </div>
                        )
                      })}
                      <div className="flex items-center justify-between pt-0.5 text-slate-400 dark:text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Tag className="h-3 w-3 shrink-0 opacity-60" />
                          <span>...</span>
                        </div>
                        <span className="font-mono text-[8.5px] text-slate-400">
                          {activeSourceObj.lag}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SVG CONNECTOR BRIDGE 2: Business view -> Target & Consumers (with Traveling Particles) */}
                <div className="pointer-events-none relative z-20 -mx-0.5 flex items-center justify-center">
                  <svg
                    className="h-[180px] w-full overflow-visible"
                    viewBox="0 0 32 180"
                    fill="none"
                  >
                    {/* Top Green Dashed Arrow -> Target (MongoDB Atlas) */}
                    <path
                      d="M 0 58 L 28 58"
                      stroke="#10B981"
                      strokeWidth="1.4"
                      strokeDasharray="3 2.5"
                    />
                    <circle r="2.3" fill="#10B981">
                      <animateMotion
                        dur={isAuthenticating ? '0.4s' : '1.1s'}
                        repeatCount="indefinite"
                        path="M 0 58 L 28 58"
                      />
                    </circle>
                    <path
                      d="M 24 54.5 L 29.5 58 L 24 61.5"
                      stroke="#10B981"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Bottom Blue Dashed Arrow -> Consumers (Applications & AI) */}
                    <path
                      d="M 0 142 L 28 142"
                      stroke="#3B82F6"
                      strokeWidth="1.4"
                      strokeDasharray="3 2.5"
                    />
                    <circle r="2.3" fill="#3B82F6">
                      <animateMotion
                        dur={isAuthenticating ? '0.45s' : '1.35s'}
                        repeatCount="indefinite"
                        path="M 0 142 L 28 142"
                      />
                    </circle>
                    <path
                      d="M 24 138.5 L 29.5 142 L 24 145.5"
                      stroke="#3B82F6"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* COLUMN 3: Target & Consumers */}
                <div className="z-10 flex flex-col justify-between gap-3">
                  {/* Target Box */}
                  <div
                    onClick={() => setInspectJson((v) => !v)}
                    className="flex flex-1 cursor-pointer flex-col justify-between rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-2.5 xl:p-3 dark:border-white/[0.08] dark:bg-white/[0.02]"
                  >
                    <div className="text-[10.5px] font-bold whitespace-nowrap text-[#071026] dark:text-white">
                      {t('auth.showcase.target.title')}
                    </div>
                    <div className="flex items-center gap-2 rounded-[10px] border border-[#A7F3D0] bg-[#ECFDF5] p-2 transition-transform hover:scale-[1.02] xl:p-2.5 dark:border-emerald-800/50 dark:bg-emerald-950/40">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/90 shadow-2xs xl:h-6 xl:w-6 dark:bg-emerald-950">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12.42 2.15C12.18 1.82 12 1.5 12 1.5C12 1.5 11.82 1.82 11.58 2.15C9.12 5.48 6.75 8.85 6.75 13.05C6.75 16.72 9.04 19.34 11.45 20.25L12 20.45L12.55 20.25C14.96 19.34 17.25 16.72 17.25 13.05C17.25 8.85 14.88 5.48 12.42 2.15Z"
                            fill="#10AA50"
                          />
                          <path
                            d="M12 1.5C12 1.5 11.82 1.82 11.58 2.15C9.12 5.48 6.75 8.85 6.75 13.05C6.75 16.72 9.04 19.34 11.45 20.25L12 20.45V1.5Z"
                            fill="#13AA52"
                          />
                          <path
                            d="M12 1.5V20.45L12.55 20.25C14.96 19.34 17.25 16.72 17.25 13.05C17.25 8.85 14.88 5.48 12.42 2.15C12.18 1.82 12 1.5 12 1.5Z"
                            fill="#00684A"
                            fillOpacity="0.35"
                          />
                          <path d="M11.65 19.8L12 22.5L12.35 19.8H11.65Z" fill="#B8C4C2" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9.5px] leading-tight font-bold whitespace-nowrap text-[#071026] xl:text-[10px] dark:text-white">
                          MongoDB Atlas
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[8.5px] font-semibold whitespace-nowrap text-[#059669] dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#10B981]" />
                          <span>{t('auth.showcase.target.synced')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Consumers Box */}
                  <div className="flex flex-1 flex-col justify-between rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-2.5 xl:p-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <div className="text-[10.5px] font-bold whitespace-nowrap text-[#071026] dark:text-white">
                      {t('auth.showcase.consumers.title')}
                    </div>
                    <div className="flex items-center gap-2 rounded-[10px] border border-slate-200/60 bg-white p-2 xl:p-2.5 dark:border-white/[0.06] dark:bg-[#1A1E29]">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#3B82F6] text-white shadow-2xs xl:h-6 xl:w-6">
                        <LayoutGrid className="h-3 w-3 xl:h-3.5 xl:w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9.5px] leading-tight font-bold whitespace-nowrap text-[#071026] xl:text-[10px] dark:text-white">
                          {t('auth.showcase.consumers.applicationsAndAi')}
                        </div>
                        <div className="mt-0.5 text-[8px] leading-tight whitespace-nowrap text-slate-400 xl:text-[8.5px]">
                          {t('auth.showcase.consumers.channels')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
