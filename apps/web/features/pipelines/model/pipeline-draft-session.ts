/**
 * Holds a pipeline creation hand-off while the creation surface transitions to
 * the editor. The guided builder keeps this draft in memory until the user has
 * supplied the source, transform, and Atlas destination parts of the DSL.
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
