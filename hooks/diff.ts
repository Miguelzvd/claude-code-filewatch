export type DiffLine = { kind: 'ctx' | 'add' | 'del' | 'gap'; text: string; line?: number }
export type EditDiff = { lines: DiffLine[]; added: number; removed: number; matches: number }

const CONTEXT = 2
const MAX_HUNKS = 5

// The diff an Edit would make, built before it runs: the file is still untouched, so git cannot show it.
// Whole lines around each match, common lines trimmed, `line` is the 1-based line in the current file.
export function buildEditDiff(content: string, oldString: string, newString: string, replaceAll = false): EditDiff | null {
  if (!oldString) return null
  const file = content.split('\n')
  const hunks: DiffLine[][] = []
  let added = 0
  let removed = 0
  let matches = 0
  let from = 0
  while (true) {
    const at = content.indexOf(oldString, from)
    if (at < 0) break
    matches++
    from = at + oldString.length
    const start = content.lastIndexOf('\n', at - 1) + 1
    const nl = content.indexOf('\n', at + oldString.length)
    const end = nl < 0 ? content.length : nl
    const before = content.slice(start, at)
    const after = content.slice(at + oldString.length, end)
    const oldLines = (before + oldString + after).split('\n')
    const newLines = (before + newString + after).split('\n')
    const first = content.slice(0, start).split('\n').length - 1
    let head = 0
    while (head < oldLines.length && head < newLines.length && oldLines[head] === newLines[head]) head++
    let tail = 0
    while (tail < oldLines.length - head && tail < newLines.length - head && oldLines[oldLines.length - 1 - tail] === newLines[newLines.length - 1 - tail]) tail++
    const del = oldLines.slice(head, oldLines.length - tail)
    const add = newLines.slice(head, newLines.length - tail)
    const top = first + head
    const bottom = top + del.length
    const lines: DiffLine[] = []
    for (let i = Math.max(0, top - CONTEXT); i < top; i++) lines.push({ kind: 'ctx', text: file[i] ?? '', line: i + 1 })
    del.forEach((text, i) => lines.push({ kind: 'del', text, line: top + i + 1 }))
    for (const text of add) lines.push({ kind: 'add', text })
    for (let i = bottom; i < Math.min(file.length, bottom + CONTEXT); i++) lines.push({ kind: 'ctx', text: file[i] ?? '', line: i + 1 })
    removed += del.length
    added += add.length
    hunks.push(lines)
    if (!replaceAll) break
  }
  if (!matches) return null
  const lines: DiffLine[] = []
  hunks.slice(0, MAX_HUNKS).forEach((h, i) => {
    if (i) lines.push({ kind: 'gap', text: '' })
    lines.push(...h)
  })
  if (hunks.length > MAX_HUNKS) lines.push({ kind: 'gap', text: `${hunks.length - MAX_HUNKS} more` })
  return { lines, added, removed, matches }
}
