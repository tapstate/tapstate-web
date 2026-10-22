export interface CanvasNoteRecord {
  id: string
  text: string
  position: { x: number; y: number }
}

export function readCanvasNotes(pipelineId: string): CanvasNoteRecord[] {
  try {
    const raw = localStorage.getItem(`tapstate:pipeline-notes:${pipelineId}`)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is CanvasNoteRecord =>
        typeof item?.id === 'string' &&
        typeof item?.text === 'string' &&
        typeof item?.position?.x === 'number' &&
        typeof item?.position?.y === 'number',
    )
  } catch {
    return []
  }
}
