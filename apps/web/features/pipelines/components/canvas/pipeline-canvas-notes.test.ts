import { describe, expect, it } from 'vitest'

import { applyCanvasNotePositions, type CanvasNoteRecord } from './pipeline-canvas-notes'

describe('applyCanvasNotePositions', () => {
  it('persists every note moved in a group drag and leaves other notes in place', () => {
    const notes: CanvasNoteRecord[] = [
      { id: 'note-a', text: 'A', position: { x: 10, y: 20 } },
      { id: 'note-b', text: 'B', position: { x: 30, y: 40 } },
      { id: 'note-c', text: 'C', position: { x: 50, y: 60 } },
    ]

    const moved = applyCanvasNotePositions(notes, [
      { id: 'note-a', position: { x: 100, y: 110 } },
      { id: 'note-b', position: { x: 120, y: 130 } },
    ])

    expect(moved).toEqual([
      { id: 'note-a', text: 'A', position: { x: 100, y: 110 } },
      { id: 'note-b', text: 'B', position: { x: 120, y: 130 } },
      notes[2],
    ])
  })
})
