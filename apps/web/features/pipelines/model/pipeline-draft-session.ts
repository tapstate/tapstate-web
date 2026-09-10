/**
 * Holds a pipeline creation hand-off while the creation surface transitions to
 * the editor. A new Pipeline cannot be persisted until it references at least
 * one Source, so the DAG designer starts as an in-memory draft and persists it
 * once the first valid graph is ready.
 */
export interface StagedPipelineDraft {
  id: string
  description: string
}

const stagedDrafts = new Map<string, StagedPipelineDraft>()

export function stagePipelineDraft(draft: StagedPipelineDraft) {
  stagedDrafts.set(draft.id, draft)
}

export function getStagedPipelineDraft(id: string): StagedPipelineDraft | null {
  return stagedDrafts.get(id) ?? null
}

export function clearStagedPipelineDraft(id: string) {
  stagedDrafts.delete(id)
}
