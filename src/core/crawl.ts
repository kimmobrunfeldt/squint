import { Page } from 'puppeteer'
import { URL } from 'url'
import { Pool } from 'generic-pool'
import _ from 'lodash'
import PQueue from 'p-queue'
import { Config, CrawlFilter } from '../config'
import chalk from 'chalk'

function normalizeUrl(
  url: string,
  opts: Pick<Config, 'includeHash' | 'trailingSlashMode'>
): string {
  const urlParts = new URL(url)
  if (!opts.includeHash) {
    urlParts.hash = ''
  }

  if (opts.trailingSlashMode === 'add') {
    urlParts.pathname = `${_.trimEnd(urlParts.pathname, '/')}/`
  } else if (opts.trailingSlashMode === 'remove') {
    urlParts.pathname = _.trimEnd(urlParts.pathname, '/')
  }

  return urlParts.toString()
}

export type CrawlFilterOptions = {
  baseUrl: string
}
type CrawlFilterFunctions = {
  [name in CrawlFilter]: (
    opts: CrawlFilterOptions,
    currentUrl: string,
    href: string
  ) => boolean
}
const crawlFilterFunctions: CrawlFilterFunctions = {
  siteInternal: (opts, currentUrl, href) => {
    const hrefUrlParts = new URL(href, currentUrl)
    const urlNewParts = new URL(opts.baseUrl)
    const isInternal =
      urlNewParts.host.toLowerCase() === hrefUrlParts.host.toLowerCase()
    return isInternal
  },
}

export function createShouldVisit(
  crawlFilters: CrawlFilter[],
  opts: CrawlFilterOptions
): NonNullable<CrawlInputs['shouldVisit']> {
  return function shouldVisit(currentUrl, href) {
    const filterResults = crawlFilters.map((name) =>
      crawlFilterFunctions[name](opts, currentUrl, href)
    )
    return _.every(filterResults)
  }
}

type CrawlInputs = {
  pagePool: Pool<Page>
  urlsToVisit: Set<string>
  shouldVisit?: (currentUrl: string, href: string) => boolean
} & Pick<Config, 'includeHash' | 'trailingSlashMode' | 'maxDepth'>

type CrawlInternalMemory = {
  visited: Set<string>
  depth: number
}
// Breadth-first traversal of urls
export async function crawlPaths(
  inputs: CrawlInputs,
  memory: CrawlInternalMemory = { visited: new Set<string>(), depth: 0 }
): Promise<Array<string>> {
  const { pagePool, urlsToVisit, shouldVisit = () => true, maxDepth } = inputs

  const queue = new PQueue()
  const newUrlsToVisit: Set<string> = new Set()

  urlsToVisit.forEach((url) => {
    const visitTask = async () => {
      const hrefs = await pagePool.use(async (page) => {
        await page.goto(url, { waitUntil: 'networkidle2' })
        return page.$$eval('a', (as) =>
          (as as HTMLAnchorElement[]).map((a) => a.href)
        )
      })

      console.error(chalk.dim`Visited ${url}`)
      memory.visited.add(url)

      if (memory.depth >= maxDepth) {
        // Stop following links if max depth has been reached already
        return
      }

      hrefs.forEach((href) => {
        const resolvedHrefParts = new URL(href, url)
        const resolvedHref = normalizeUrl(resolvedHrefParts.toString(), inputs)
        const isVisitedAlready = memory.visited.has(resolvedHref)
        const isCorrectProtocol = ['http:', 'https:'].includes(
          resolvedHrefParts.protocol
        )
        if (shouldVisit(url, href) && isCorrectProtocol && !isVisitedAlready) {
          newUrlsToVisit.add(resolvedHref)
        }
      })
    }

    queue.add(visitTask)
  })

  await queue.onIdle()

  if (newUrlsToVisit.size > 0) {
    await crawlPaths(
      { ...inputs, urlsToVisit: newUrlsToVisit },
      { ...memory, depth: memory.depth + 1 }
    )
  }

  const urls = [...memory.visited]
  const urlPaths = new Set(
    urls.map((url) => {
      const parts = new URL(url)
      return `${parts.pathname}${parts.search}${parts.hash}`
    })
  )

  return [...urlPaths]
}
