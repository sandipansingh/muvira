import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { expect, test } from 'playwright/test'

const run = promisify(execFile)

interface Finding {
  horizontalOverflow: boolean
  outOfViewport: unknown[]
  smallTargets: unknown[]
  smallText: unknown[]
  clippedContent: unknown[]
  floatingOverlaps: unknown[]
  imageRisks: unknown[]
  imageResolutionRisks: unknown[]
}

interface AuditResult {
  route: string
  viewport: { width: number; height: number; label: string; dpr: number }
  screenshot: string | null
  navigationError: string | null
  consoleMessages: { type: string; text: string }[]
  findings: Finding | null
}

interface Audit {
  routes: unknown[]
  viewports: unknown[]
  results: AuditResult[]
}

async function audit(args: string[], filename: string): Promise<Audit> {
  await run(process.execPath, ['responsive-audit/audit.mjs', '--after', ...args], {
    timeout: 18 * 60 * 1000,
    maxBuffer: 2 * 1024 * 1024,
  })
  return JSON.parse(await readFile(`responsive-audit/after/${filename}`, 'utf8')) as Audit
}

function violations(results: AuditResult[], overlay: boolean): string[] {
  const problems: string[] = []
  for (const result of results) {
    const label = `${result.route} ${result.viewport.width}x${result.viewport.height} ${result.viewport.label} DPR${result.viewport.dpr}`
    if (result.navigationError || !result.findings || !result.screenshot) {
      problems.push(`${label}: ${result.navigationError || 'missing findings or screenshot'}`)
      continue
    }

    const findings = result.findings
    if (findings.horizontalOverflow) problems.push(`${label}: document horizontal overflow`)
    for (const key of [
      'outOfViewport',
      'smallTargets',
      'smallText',
      'clippedContent',
      'imageRisks',
    ] as const) {
      if (findings[key].length)
        problems.push(`${label}: ${key} ${JSON.stringify(findings[key].slice(0, 2))}`)
    }
    if (!overlay && findings.floatingOverlaps.length) {
      problems.push(
        `${label}: fixed/sticky overlap ${JSON.stringify(findings.floatingOverlaps.slice(0, 2))}`
      )
    }
    for (const message of result.consoleMessages) {
      if (
        message.type === 'warning' &&
        /^Unrecognized feature: 'web-share'\.?$/.test(message.text)
      ) {
        continue // Chromium warning from the externally hosted Razorpay checkout SDK.
      }
      problems.push(`${label}: console ${message.type}: ${message.text}`)
    }
  }
  return problems
}

test('storefront routes reflow across the full viewport, DPR, and text-size matrix', async () => {
  const result = await audit([], 'findings.json')
  expect(result.routes.length).toBe(21)
  expect(result.viewports.length).toBe(35)
  expect(result.results.length).toBe(result.routes.length * result.viewports.length)
  expect(violations(result.results, false).slice(0, 30)).toEqual([])
})

test('mobile and desktop overlays remain reachable without layout failures', async () => {
  const result = await audit(['--overlays'], 'overlay-findings.json')
  expect(result.results.length).toBe(21)
  expect(violations(result.results, true).slice(0, 30)).toEqual([])
})
