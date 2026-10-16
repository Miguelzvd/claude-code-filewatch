import { expect, test } from 'claude-code/testing'
import { reviewMark, reviewRemove, reviewWait } from '../hooks/review'

test('review mark: one file per review in the temp folder, with the separators of the OS', () => {
  expect(reviewMark('linux', '/tmp/', 's1', 3)).toBe('/tmp/filewatch-review-s1-3.mark')
  expect(reviewMark('win32', 'C:\\Users\\k\\AppData\\Local\\Temp\\', 's1', 3)).toBe('C:\\Users\\k\\AppData\\Local\\Temp\\filewatch-review-s1-3.mark')
  expect(reviewMark('win32', 'C:/Windows/Temp', 's1', 3)).toBe('C:\\Windows\\Temp\\filewatch-review-s1-3.mark')
})

test('review wait: sh on Linux and macOS, PowerShell on Windows, the mark never spliced into a command line', () => {
  const mark = '/tmp/A & B/$(touch nope).mark'
  for (const os of ['linux', 'darwin'] as const) {
    const { argv, init } = reviewWait(os, mark, 600_000)
    expect(argv.slice(0, 2)).toEqual(['sh', '-c'])
    expect(argv.at(-1)).toBe(mark)
    expect(argv[2]).not.toContain(mark)
    expect(init).toEqual({ timeoutMs: 600_000 })
  }
  const win = 'C:\\Users\\k\\A & B\\x.mark'
  const { argv, init } = reviewWait('win32', win, 600_000)
  expect(argv.slice(0, 4)).toEqual(['powershell', '-NoProfile', '-NonInteractive', '-Command'])
  expect(argv.join(' ')).not.toContain(win)
  expect(init).toEqual({ timeoutMs: 600_000, env: { FILEWATCH_MARK: win } })
})

test('review remove: rm -f on Linux and macOS, Remove-Item on Windows', () => {
  expect(reviewRemove('linux', '/tmp/x.mark').argv).toEqual(['rm', '-f', '/tmp/x.mark'])
  const win = reviewRemove('win32', 'C:\\t\\x.mark')
  expect(win.argv[4]).toContain('Remove-Item')
  expect(win.init.env).toEqual({ FILEWATCH_MARK: 'C:\\t\\x.mark' })
})
