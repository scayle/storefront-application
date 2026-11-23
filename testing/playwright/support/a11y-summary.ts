/**
 * Summarizes the axe results a run with `A11Y=1` left in `test-results/`. Run it with
 * `pnpm a11y:summary [results dir]` after `pnpm test:e2e:a11y`. Node runs the file directly,
 * so it stays free of imports from the rest of the suite.
 *
 * Findings are grouped by rule and impact, with the pages and viewports they appear on. A rule
 * that fires on the same selector on the same page counts once, since several tests visit the
 * same page.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, join, sep } from 'node:path'
import process from 'node:process'

const RESULT_FILE = /^axe-(?!failed-).*\.json$/
const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor']

interface AxeNode {
  target: unknown[]
}

interface AxeFinding {
  id: string
  impact?: string | null
  help: string
  nodes: AxeNode[]
}

interface ScanResult {
  label: string
  url: string
  project: string
  violations: AxeFinding[]
  incomplete: AxeFinding[]
}

interface RuleSummary {
  impact: string
  help: string
  pages: Set<string>
  projects: Set<string>
  selectors: Set<string>
}

const resultsDir = process.argv[2] ?? 'test-results'

if (!existsSync(resultsDir)) {
  console.error(
    `No results folder at ${resultsDir}. Run the checks first, for example with pnpm test:e2e:a11y.`,
  )
  process.exit(1)
}

const files = readdirSync(resultsDir, { recursive: true }).map(String)
// Playwright copies every attachment into an `attachments/` folder, which would count a scan twice.
const failedScans = files.filter(
  (file) =>
    basename(file).startsWith('axe-failed-') &&
    !file.split(sep).includes('attachments'),
).length

const results: ScanResult[] = files
  .filter((file) => RESULT_FILE.test(basename(file)))
  .flatMap((file) => {
    try {
      return [JSON.parse(readFileSync(join(resultsDir, file), 'utf8'))]
    } catch {
      console.warn(
        `Skipped ${file}: it is not valid JSON, probably from an aborted run.`,
      )
      return []
    }
  })

function summarize(kind: 'violations' | 'incomplete') {
  const rules = new Map<string, RuleSummary>()
  for (const result of results) {
    for (const finding of result[kind]) {
      const rule = rules.get(finding.id) ?? {
        impact: finding.impact ?? 'unknown',
        help: finding.help,
        pages: new Set<string>(),
        projects: new Set<string>(),
        selectors: new Set<string>(),
      }
      const page = result.label
      rule.pages.add(page)
      rule.projects.add(result.project)
      for (const node of finding.nodes) {
        rule.selectors.add(`${page} ${result.project} ${node.target.join(' ')}`)
      }
      rules.set(finding.id, rule)
    }
  }
  return [...rules.entries()].sort(
    ([, a], [, b]) =>
      IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact) ||
      b.selectors.size - a.selectors.size,
  )
}

function printTable(title: string, kind: 'violations' | 'incomplete') {
  const rows = summarize(kind)
  console.log(`\n## ${title} (${rows.length} rules)\n`)
  if (rows.length === 0) {
    console.log('None.')
    return
  }
  console.log('| Rule | Impact | Elements | Pages | Viewports |')
  console.log('| --- | --- | --- | --- | --- |')
  for (const [id, rule] of rows) {
    console.log(
      `| ${id}: ${rule.help} | ${rule.impact} | ${rule.selectors.size} | ${[...rule.pages].sort().join(', ')} | ${[...rule.projects].sort().join(', ')} |`,
    )
  }
}

const scannedPages = new Set(results.map((result) => result.label))
console.log(
  `Scanned ${scannedPages.size} page types in ${new Set(results.map((result) => result.project)).size} projects: ${[...scannedPages].sort().join(', ')}`,
)
if (failedScans > 0) {
  console.log(
    `${failedScans} scans failed and are not in this summary. Look for the axe-failed-* attachments.`,
  )
}
printTable('Violations', 'violations')
printTable('Needs review (incomplete)', 'incomplete')
