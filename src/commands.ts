import { Pool } from 'generic-pool'
import path from 'path'
import fs from 'fs'
import { Page } from 'puppeteer'
import { evalJs, promiseEachSeries } from './utils'
import { clean, compareUrls } from './core/compare'
import { Config } from './config'
import { crawlPaths } from './core/crawl'
import { screenshot } from './core/screenshot'
import chalk from 'chalk'

function siteInternalCheck(href: string, currentUrl: string, baseUrl: string) {
  const hrefUrlParts = new URL(href, currentUrl)
  const urlNewParts = new URL(baseUrl)
  const isInternal =
    urlNewParts.host.toLowerCase() === hrefUrlParts.host.toLowerCase()
  return isInternal
}

function createShouldVisit(config: Config, baseUrl: string) {
  return (
    resolvedHref: string,
    hrefDetails: { currentUrl: string; href: string },
    visited: Set<string>
  ) => {
    const customShouldVisit = config.shouldVisit
      ? (evalJs(
          config.shouldVisit,
          new URL(resolvedHref),
          hrefDetails,
          visited,
          config
        ) as boolean)
      : true
    const isInternal = siteInternalCheck(
      hrefDetails.href,
      hrefDetails.currentUrl,
      baseUrl
    )

    return isInternal && customShouldVisit
  }
}

export async function crawlCommand(pagePool: Pool<Page>, config: Config) {
  const paths = await crawlPaths({
    ...config,
    pagePool,
    // Use new url as the basis for traversal.
    // This will correctly show new pages that are not yet in the old version
    urlsToVisit: new Set<string>([config.crawlUrl]),
    shouldVisit: createShouldVisit(config, config.crawlUrl),
  })

  ;[...paths].forEach((urlPath) => console.log(urlPath))
}

export async function compareCommand(pagePool: Pool<Page>, config: Config) {
  console.error('Cleaning output directory ..')
  await clean(config)

  if (config.singlePage) {
    console.error(`Comparing ${config.oldUrl} to ${config.newUrl} ..`)
    await compareUrls(pagePool, config.oldUrl, config.newUrl, config)
  } else {
    await compareMultiMode(pagePool, config)
    console.error(`Saved comparison images to ${path.resolve(config.outDir)}`)
  }
}

async function compareMultiMode(pagePool: Pool<Page>, config: Config) {
  let paths
  if (config.pathsFile) {
    const content = await fs.promises.readFile(config.pathsFile, {
      encoding: 'utf-8',
    })
    paths = content
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => Boolean(line))
  } else {
    paths = await crawlPaths({
      ...config,
      pagePool,
      // Use new url as the basis for traversal.
      // This will correctly show new pages that are not yet in the old version
      urlsToVisit: new Set<string>([config.newUrl]),
      shouldVisit: createShouldVisit(config, config.newUrl),
    })
  }

  await promiseEachSeries(paths, async (urlPath) => {
    const oldUrl = new URL(urlPath, config.oldUrl).toString()
    const newUrl = new URL(urlPath, config.newUrl).toString()

    console.error(
      chalk`Comparing {dim ${config.oldUrl}}${urlPath} {dim to} {dim ${config.newUrl}}${urlPath} ..`
    )
    await compareUrls(pagePool, oldUrl, newUrl, config)
  })
}

export async function screenshotCommand(pagePool: Pool<Page>, config: Config) {
  try {
    await fs.promises.mkdir(path.dirname(config.outFile), { recursive: true })
  } catch (e) {
    // ignore
  }

  await screenshot(pagePool, config)

  console.error(`Saved screenshot to ${path.resolve(config.outFile)}`)
}
