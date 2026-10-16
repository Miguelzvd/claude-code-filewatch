import { expect, test } from 'claude-code/testing'
import { buildEditDiff } from '../hooks/diff'

const file = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].join('\n')

test('edit diff: a one-line change shows the removed and added line with context around it', () => {
  const d = buildEditDiff(file, 'd', 'D')
  expect(d?.added).toBe(1)
  expect(d?.removed).toBe(1)
  expect(d?.lines).toEqual([
    { kind: 'ctx', text: 'b', line: 2 },
    { kind: 'ctx', text: 'c', line: 3 },
    { kind: 'del', text: 'd', line: 4 },
    { kind: 'add', text: 'D' },
    { kind: 'ctx', text: 'e', line: 5 },
    { kind: 'ctx', text: 'f', line: 6 },
  ])
})

test('edit diff: lines the edit leaves alone are context, not a removal and an addition', () => {
  const d = buildEditDiff('x\ny\nz', 'x\ny', 'x\nY')
  expect(d?.lines.filter(l => l.kind === 'del' || l.kind === 'add')).toEqual([
    { kind: 'del', text: 'y', line: 2 },
    { kind: 'add', text: 'Y' },
  ])
})

test('edit diff: an edit inside a line diffs the whole line', () => {
  const d = buildEditDiff('const a = 1', 'a = 1', 'a = 2')
  expect(d?.lines).toEqual([
    { kind: 'del', text: 'const a = 1', line: 1 },
    { kind: 'add', text: 'const a = 2' },
  ])
})

test('edit diff: deleting lines and inserting lines count in added and removed', () => {
  expect(buildEditDiff(file, 'c\nd\n', '')).toMatchObject({ added: 0, removed: 2 })
  expect(buildEditDiff(file, 'c', 'c\nc2\nc3')).toMatchObject({ added: 2, removed: 0 })
})

test('edit diff: replace_all lists every match, one only without it', () => {
  const text = 'x\nfoo\ny\nfoo\nz'
  expect(buildEditDiff(text, 'foo', 'bar')?.matches).toBe(1)
  const all = buildEditDiff(text, 'foo', 'bar', true)
  expect(all?.matches).toBe(2)
  expect(all?.removed).toBe(2)
  expect(all?.lines.some(l => l.kind === 'gap')).toBe(true)
})

test('edit diff: no match or an empty old string has no diff', () => {
  expect(buildEditDiff(file, 'zzz', 'q')).toBeNull()
  expect(buildEditDiff(file, '', 'q')).toBeNull()
})
