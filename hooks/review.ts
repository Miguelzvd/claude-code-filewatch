type Os = 'linux' | 'darwin' | 'win32'

const MARK_ENV = 'FILEWATCH_MARK'
const WIN_WAIT = `while (-not (Test-Path -LiteralPath $env:${MARK_ENV})) { Start-Sleep -Milliseconds 200 }`
const WIN_REMOVE = `Remove-Item -LiteralPath $env:${MARK_ENV} -Force -ErrorAction SilentlyContinue`
const POSIX_WAIT = 'while [ ! -e "$1" ]; do sleep 0.2; done'

// The file the buttons create to end the wait: one per review, in the temp folder.
export function reviewMark(os: Os, tmp: string, session: string, n: number): string {
  const dir = tmp.replace(/[\\/]+$/, '')
  const mark = `${dir}/filewatch-review-${session}-${n}.mark`
  return os === 'win32' ? mark.replace(/\//g, '\\') : mark
}

// A child that runs until the mark exists. A child in flight is a `$` call in flight, which does not
// count against the hook's 10 s budget, so the person can take longer than that to decide.
export function reviewWait(os: Os, mark: string, timeoutMs: number) {
  return os === 'win32'
    ? { argv: ['powershell', '-NoProfile', '-NonInteractive', '-Command', WIN_WAIT], init: { timeoutMs, env: { [MARK_ENV]: mark } } }
    : { argv: ['sh', '-c', POSIX_WAIT, 'sh', mark], init: { timeoutMs } }
}

export function reviewRemove(os: Os, mark: string) {
  return os === 'win32'
    ? { argv: ['powershell', '-NoProfile', '-NonInteractive', '-Command', WIN_REMOVE], init: { timeoutMs: 5_000, env: { [MARK_ENV]: mark } } }
    : { argv: ['rm', '-f', mark], init: { timeoutMs: 3_000 } }
}
