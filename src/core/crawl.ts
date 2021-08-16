import { Page } from 'puppeteer'
import { URL } from 'url'
import { Pool } from 'generic-pool'
import _ from 'lodash'
import PQueue from 'p-queue'
import { Config } from '../config'
import chalk from 'chalk'
import { union } from '../utils'

function normalizeUrl(
  url: string,
  opts: Pick<Config, 'includeHash' | 'includeSearchQuery' | 'trailingSlashMode'>
): string {
  const urlParts = new URL(url)
  if (!opts.includeHash) {
    urlParts.hash = ''
  }

  if (!opts.includeSearchQuery) {
    urlParts.search = ''
  }

  if (opts.trailingSlashMode === 'add') {
    urlParts.pathname = `${_.trimEnd(urlParts.pathname, '/')}/`
  } else if (opts.trailingSlashMode === 'remove') {
    urlParts.pathname = _.trimEnd(urlParts.pathname, '/')
  }

  return urlParts.toString()
}

type CrawlInputs = {
  pagePool: Pool<Page>
  urlsToVisit: Set<string>
  shouldVisit?: (
    resolvedHref: string,
    hrefDetails: {
      currentUrl: string
      href: string
    },
    visited: Set<string>
  ) => boolean
} & Pick<
  Config,
  'includeHash' | 'includeSearchQuery' | 'trailingSlashMode' | 'maxDepth'
>

type CrawlInternalMemory = {
  visited: Set<string>
  depth: number
}
// Breadth-first traversal of urls
export async function crawlPaths(
  inputs: CrawlInputs,
  memory: CrawlInternalMemory = {
    visited: new Set<string>(inputs.urlsToVisit),
    depth: 0,
  }
): Promise<Array<string>> {
  const { pagePool, urlsToVisit, shouldVisit = () => true, maxDepth } = inputs

  // Remember that memory is shared between the tasks that run concurrently
  // with PQueue
  const queue = new PQueue()
  const newUrlsToVisit: Set<string> = new Set()

  // Stop following links if max depth has been reached already
  const maxLinkDepthReached = memory.depth >= maxDepth
  if (!maxLinkDepthReached) {
    urlsToVisit.forEach((url) => {
      const visitTask = async () => {
        const hrefs = await pagePool.use(async (page) => {
          await page.goto(url, { waitUntil: 'networkidle2' })
          return page.$$eval('a', (as) =>
            (as as HTMLAnchorElement[]).map((a) => a.href)
          )
        })

        console.error(chalk.dim`Visited ${url}`)

        hrefs.forEach((href) => {
          const resolvedHrefParts = new URL(href, url)
          const resolvedHref = normalizeUrl(
            resolvedHrefParts.toString(),
            inputs
          )
          const isVisitedAlready = memory.visited.has(resolvedHref)
          const isCorrectProtocol = ['http:', 'https:'].includes(
            resolvedHrefParts.protocol
          )
          const shouldVisitResult =
            isCorrectProtocol &&
            !isVisitedAlready &&
            shouldVisit(resolvedHref, { currentUrl: url, href }, memory.visited)

          if (shouldVisitResult) {
            newUrlsToVisit.add(resolvedHref)
            memory.visited.add(resolvedHref)
          }
        })
      }

      queue.add(visitTask)
    })
  }

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
