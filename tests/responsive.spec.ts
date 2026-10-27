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
      if (
        message.type === 'warning' &&
        message.text.startsWith(
          'You have Reduced Motion enabled on your device. Animations may not appear as expected.'
        ) &&
        message.text.includes('https://motion.dev/troubleshooting/reduced-motion-disabled')
      ) {
        continue // Motion reports the reduced-motion preference deliberately enabled by this audit.
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
  expect(result.results.length).toBe(22)
  expect(violations(result.results, true).slice(0, 30)).toEqual([])
})

test('authenticated customer and admin pages render across mobile, tablet, desktop and enlarged text', async () => {
  await run(process.execPath, ['tests/fixtures/editorial-audit.mjs'], {
    timeout: 10 * 60 * 1000,
    maxBuffer: 2 * 1024 * 1024,
  })
  const report = JSON.parse(
    await readFile('responsive-audit/redesign/authenticated-findings.json', 'utf8')
  )
  expect(report.routes).toHaveLength(45)
  expect(report.results).toHaveLength(225)
  for (const result of report.results) {
    expect(result.error, `${result.name} ${result.viewport.label}`).toBeUndefined()
    expect(result.errors).toEqual([])
    expect(result.blocked).toEqual([])
    expect(result.findings.horizontalOverflow, `${result.name} ${result.viewport.label}`).toBe(
      false
    )
    expect(result.findings.headings).toBe(1)
    expect(result.findings.smallFields).toEqual([])
  }
})

test('protected editors and confirmation dialogs reflow and restore keyboard focus', async () => {
  await run(process.execPath, ['tests/fixtures/editorial-overlays.mjs'], {
    timeout: 10 * 60 * 1000,
    maxBuffer: 2 * 1024 * 1024,
  })
  const report = JSON.parse(
    await readFile('responsive-audit/redesign/protected-overlays.json', 'utf8')
  )
  expect(report.results).toHaveLength(78)
  expect(report.failures).toEqual([])
})

test('heritage photography, navigation, gallery and purchase states work across input modes', async () => {
  await run(process.execPath, ['tests/fixtures/heritage-audit.mjs'], {
    timeout: 10 * 60 * 1000,
    maxBuffer: 2 * 1024 * 1024,
  })
  const report = JSON.parse(
    await readFile('responsive-audit/redesign/heritage-findings.json', 'utf8')
  )
  expect(report.results).toHaveLength(57)
  expect(report.failures).toEqual([])
})
