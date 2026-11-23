import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
} from '@playwright/test/reporter'

/**
 * Playwright reporter that prints skip count and skip rate at the end of a run, and lists every
 * skip that carries a `catalog-gap` annotation with its project, title and reason. The annotation
 * comes from `skipForCatalogGap`, so a data problem that turned a test into a skip shows up in the
 * job log instead of only as a percentage. Other skips are listed by reason with a count.
 *
 * Wired into local runs via `playwright.config.ts` and into CI via the
 * `--reporter` CLI flag. Visibility only:
 * it never fails a run and does not apply a skip-rate threshold.
 */
class SkipRateReporter implements Reporter {
  private suite: Suite | undefined

  onBegin(_config: FullConfig, suite: Suite): void {
    this.suite = suite
  }

  onEnd(_result: FullResult): void {
    const tests = this.suite?.allTests() ?? []
    const skipped = tests.filter((test) =>
      test.results.some((result) => result.status === 'skipped'),
    ).length
    const didNotRun = tests.filter((test) => test.results.length === 0).length
    const totalWithResults = tests.length - didNotRun
    const executed = totalWithResults - skipped
    const skipRate =
      totalWithResults > 0
        ? ((skipped / totalWithResults) * 100).toFixed(1)
        : 'N/A'
    console.log(
      `[playwright-skip-reporter] E2E: ${skipped} skipped / ${executed} executed (${skipRate}% skip rate)`,
    )

    const catalogGapSkips = tests.flatMap((test) => {
      // The last result decides: a test that was skipped on a retry and passed later is not a skip.
      const result = test.results.at(-1)
      if (result?.status !== 'skipped') {
        return []
      }
      const reasons = [...test.annotations, ...result.annotations]
        .filter((annotation) => annotation.type === 'catalog-gap')
        .map((annotation) => annotation.description ?? 'no reason given')
      if (reasons.length === 0) {
        return []
      }
      const project = test.parent.project()?.name ?? 'unknown project'
      return [
        `  - [${project}] ${test.titlePath().slice(3).join(' › ')}: ${[...new Set(reasons)].join(' ')}`,
      ]
    })
    // Every other skip with a reason, grouped so that a skip by design, such as a test that only
    // runs in chromium, takes one line with a count and does not hide the ones that matter.
    const otherSkipReasons = new Map<string, number>()
    for (const test of tests) {
      const result = test.results.at(-1)
      if (result?.status !== 'skipped') {
        continue
      }
      const annotations = [...test.annotations, ...result.annotations]
      if (annotations.some((annotation) => annotation.type === 'catalog-gap')) {
        continue
      }
      const reason =
        annotations.find((annotation) => annotation.type === 'skip')
          ?.description ?? 'no reason given'
      otherSkipReasons.set(reason, (otherSkipReasons.get(reason) ?? 0) + 1)
    }

    if (catalogGapSkips.length > 0) {
      console.log(
        `[playwright-skip-reporter] ${catalogGapSkips.length} skipped for a catalog gap (data the shop does not have):\n${catalogGapSkips.join('\n')}`,
      )
    }
    if (otherSkipReasons.size > 0) {
      const lines = [...otherSkipReasons]
        .sort((a, b) => b[1] - a[1])
        .map(([reason, count]) => `  - ${count}x ${reason}`)
      console.log(
        `[playwright-skip-reporter] other skips by reason:\n${lines.join('\n')}`,
      )
    }
  }

  printsToStdio(): boolean {
    return true
  }
}

export default SkipRateReporter
