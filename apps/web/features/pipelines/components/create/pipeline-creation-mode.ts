import type { ComponentType, SVGProps } from 'react'

import { Database, LayoutTemplate, Network, Sparkles } from 'lucide-react'

export type PipelineCreationMode = 'wizard' | 'sql' | 'dag' | 'ai'

export interface PipelineCreationModeDefinition {
  value: PipelineCreationMode
  labelKey: string
  descriptionKey: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  tone: PipelineCreationMode
  available: boolean
}

export const pipelineCreationModes: PipelineCreationModeDefinition[] = [
  {
    value: 'wizard',
    labelKey: 'pipelines.createMenu.wizard',
    descriptionKey: 'pipelines.createMenu.wizardDescription',
    icon: LayoutTemplate,
    tone: 'wizard',
    available: true,
  },
  {
    value: 'sql',
    labelKey: 'pipelines.createMenu.sql',
    descriptionKey: 'pipelines.createMenu.sqlDescription',
    icon: Database,
    tone: 'sql',
    available: false,
  },
  {
    value: 'dag',
    labelKey: 'pipelines.createMenu.dag',
    descriptionKey: 'pipelines.createMenu.dagDescription',
    icon: Network,
    tone: 'dag',
    available: true,
  },
  {
    value: 'ai',
    labelKey: 'pipelines.createMenu.ai',
    descriptionKey: 'pipelines.createMenu.aiDescription',
    icon: Sparkles,
    tone: 'ai',
    available: false,
  },
]
