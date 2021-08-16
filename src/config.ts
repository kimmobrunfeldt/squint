import path from 'path'
import _ from 'lodash'
import puppeteer, { ScreenshotOptions } from 'puppeteer'
import { formatHelp, parseCliArgs } from './cli'

export type puppeteerLaunchMode =
  | {
      type: 'connect'
      options: Parameters<typeof puppeteer.connect>[0]
    }
  | {
      type: 'launch'
      options?: Parameters<typeof puppeteer.launch>[0]
    }

export type CrawlFilter = 'siteInternal'

export type Config = {
  width: number
  height: number
  includeHash: boolean
  includeSearchQuery: boolean
  crawlFilters: CrawlFilter[]
  trailingSlashMode: 'preserve' | 'remove' | 'add'
  puppeteerLaunchMode: puppeteerLaunchMode
  maxDepth: number
  outDir: string
  outFile: string
  afterGoto?: string
  afterPage?: string
  selector?: string
  selectorJs?: string
  singlePage: boolean
  pathsFile?: string
  screenshotOptions: ScreenshotOptions
  saveAll: boolean

  // Positional arguments
  command: string
  oldUrl: string
  newUrl: string
  crawlUrl: string
  screenshotUrl: string
}

export const defaultConfig = {
  width: 1280,
  height: 800,
  includeHash: false,
  includeSearchQuery: false,
  trailingSlashMode: 'preserve',
  saveAll: false,
  // This should in most cases be just 'siteInternal'
  // Removing filters would make the crawler start following
  // external links, and comparing those paths visually doesn't make sense
  crawlFilters: ['siteInternal' as const],
  maxDepth: Infinity,
  puppeteerLaunchMode: {
    type: 'launch' as const,
    options: {
      headless: true,
    },
  },
  outDir: '.squint',
  screenshotOptions: {},
}

function isEmptyArgument(val: any): boolean {
  return !_.isString(val) || val.length < 1
}

export function parseConfig() {
  const args = parseCliArgs()

  if (args['--help']) {
    console.error(formatHelp(defaultConfig))
    process.exit(0)
  }

  const command = args['_'][0]
  const outDir = args['--out-dir'] ?? defaultConfig.outDir
  const defaultOutFile =
    command === 'compare'
      ? path.join(outDir, 'diff.png')
      : path.join(outDir, 'screenshot.png')

  const config: Config = {
    width: args['--width'] ?? defaultConfig.width,
    height: args['--height'] ?? defaultConfig.height,
    includeHash: args['--include-hash'] ?? defaultConfig.includeHash,
    includeSearchQuery:
      args['--include-search-query'] ?? defaultConfig.includeSearchQuery,
    trailingSlashMode:
      args['--trailing-slash-mode'] ?? defaultConfig.trailingSlashMode,
    crawlFilters: defaultConfig.crawlFilters,
    maxDepth: args['--max-depth'] ?? defaultConfig.maxDepth,
    outDir,
    outFile: args['--out-file'] ?? defaultOutFile,
    puppeteerLaunchMode: {
      type:
        args['--puppeteer-launch-mode'] ??
        defaultConfig.puppeteerLaunchMode.type,
      options:
        args['--puppeteer-launch-options'] ??
        defaultConfig.puppeteerLaunchMode.options,
    } as Config['puppeteerLaunchMode'],
    afterGoto: args['--after-goto'],
    afterPage: args['--after-page'],
    selector: args['--selector'],
    selectorJs: args['--selector-js'],
    singlePage: args['--single-page'] ?? false,
    saveAll: args['--save-all'] ?? false,
    pathsFile: args['--paths-file'],
    screenshotOptions:
      args['--screenshot-options'] ?? defaultConfig.screenshotOptions,

    // Positional arguments
    command,
    oldUrl: args['_'][1],
    newUrl: args['_'][2],
    crawlUrl: args['_'][1],
    screenshotUrl: args['_'][1],
  }

  if (config.command === 'crawl' && isEmptyArgument(config.screenshotUrl)) {
    throw new Error(`Command crawl missing a <url> argument`)
  }

  if (config.command === 'screenshot' && isEmptyArgument(config.crawlUrl)) {
    throw new Error(`Command screenshot missing a <url> argument`)
  }

  if (config.command === 'compare' && isEmptyArgument(config.oldUrl)) {
    throw new Error(`Command compare missing <oldUrl> argument`)
  }

  if (config.command === 'compare' && isEmptyArgument(config.newUrl)) {
    throw new Error(`Command compare missing <newUrl> argument`)
  }

  if (config.command === 'compare' && !config.singlePage) {
    const oldPath = new URL(config.oldUrl).pathname
    const newPath = new URL(config.newUrl).pathname
    if (oldPath !== newPath) {
      throw new Error(`Mismatch between url paths detected!`)
    }
  }

  return config
}
