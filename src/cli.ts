import arg from 'arg'
import chalk from 'chalk'
import _ from 'lodash'
import { defaultConfig as _defaultConfig, Config } from './config'

export function formatHelp(defaultConfig: typeof _defaultConfig) {
  const helpMessage = chalk`
  {bold EXAMPLES}

      Compare beta to current production. The whole site is automatically crawled.
      {dim $ squint compare https://example.com https://beta.example.com}

      Crawl all paths from beta site and pipe output to a file. The crawler only follows site-internal links.
      {dim $ squint crawl https://beta.example.com > paths.txt}

      Get screenshot of a page.
      {dim $ squint screenshot https://beta.example.com}

      Get screenshot of a single element in a page.
      {dim $ squint screenshot --selector 'div' https://beta.example.com}

      Compare beta to current production, but use an existing file of paths.
      {dim $ squint compare --paths-file paths.txt https://example.com https://beta.example.com}

      Compare a single page.
      {dim $ squint compare --single-page https://example.com/about https://beta.example.com/about}

      Compare a single element with a selector.
      {dim $ squint compare --selector '#logo' https://example.com https://beta.example.com}

      Compare a single element, but use JS to dig an element from the page. (page: Puppeteer.Page) => HTMLElement
      {dim $ squint compare --selector-js '(page) => page.$("#logo")' https://example.com https://beta.example.com}

  {bold COMMON OPTIONS}

      --help                       Shows this help message
      --include-hash               When enabled, URL hashes are not ignored when crawling. Default: ${
        defaultConfig.includeHash
      }
      --include-search-query       When enabled, URL search queries are not ignored when crawling. Default: ${
        defaultConfig.includeSearchQuery
      }
      --should-visit               Custom JS that can limit which links crawler follows.
                                   This is an AND filter on top of all other filters.
                                   (
                                     urlToVisit: url.URL,
                                     hrefDetails: { currentUrl: string, href: string },
                                     visited: Set<string>,
                                     config: Config
                                   ) => boolean
      --trailing-slash-mode        Options: preserve, remove, add. Default: ${
        defaultConfig.trailingSlashMode
      }
      --puppeteer-launch-mode      Options: launch, connect. Default: ${
        defaultConfig.puppeteerLaunchMode.type
      }
      --puppeteer-launch-options   Puppeteer .launch or .connect options in JS. Default: ${JSON.stringify(
        defaultConfig.puppeteerLaunchMode.options
      )}
      --after-goto                 Custom JS code that will be run after Puppeteer page.goto has been called.
                                   (page: Puppeteer.Page) => Promise<void>
      --after-page                 Custom JS code that will be run after Puppeteer page has been created.
                                   (page: Puppeteer.Page) => Promise<void>

  {bold COMPARE & SCREENSHOT}

      -w --width             Viewport width for Puppeteer. Default: ${
        defaultConfig.width
      }
      -h --height            Viewport height for Puppeteer. Default: ${
        defaultConfig.height
      }
      --paths-file           File of URL paths. One path per line.
      --selector             Selector for document.querySelector. The first found element is used.
                             page.waitForSelector is called to ensure the element is visible.
      --selector-js          Selector that uses JS to dig an element. (page: Puppeteer.Page) => HTMLElement
      --screenshot-options   Puppeteer .screenshot options in JS. Overrides other options.

  {bold COMPARE}

      --out-dir              Output directory for images. Default: ${
        defaultConfig.outDir
      }
      --single-page          Disable automatic crawling. Only take a screenshot from single page.
      -o --out-file          Relevant in only in single-page mode. Output file for the diff image.
      --save-all             Saves all diff image files, even if there are zero differences.

  {bold SCREENSHOT}

      -o --out-file          Output file for the screenshot

  {bold CRAWL}

      --max-depth            Maximum depth of links to follow. Default: ${
        defaultConfig.maxDepth
      }

`
  return helpMessage
}

function assertOneOf(args: any, flag: string, allowed: string[]): void {
  if (_.isString(args[flag]) && !allowed.includes(args[flag])) {
    throw new Error(
      `Invalid value for ${flag}: '${
        args[flag]
      }'. Should be one of ${allowed.join(', ')}.`
    )
  }
}

function parseJsDataFlag(args: any, flag: string): any {
  try {
    args[flag] = eval(`(() => { return ${args[flag]}; })()`)
  } catch (e) {
    throw new Error(`Unable to \`eval\` ${flag}: ${e}`)
  }
}

export function parseCliArgs() {
  const args = arg({
    '--help': Boolean,
    '--width': Number,
    '-w': '--width',
    '--height': Number,
    '-h': '--height',
    '--include-hash': Boolean,
    '--include-search-query': Boolean,
    '--should-visit': String,
    '--trailing-slash-mode': String,
    '--max-depth': Number,
    '--puppeteer-launch-mode': String,
    '--puppeteer-launch-options': String,
    '--after-goto': String,
    '--after-page': String,
    '--single-page': Boolean,
    '--selector': String,
    '--selector-js': String,
    '--paths-file': String,
    '--screenshot-options': String,
    '--save-all': Boolean,
    '--out-dir': String,
    '--out-file': String,
    '-o': '--out-file',
  })

  assertOneOf(args, '--trailing-slash-mode', ['preserve', 'add', 'remove'])
  assertOneOf(args, '--puppeteer-launch-mode', ['launch', 'connect'])
  parseJsDataFlag(args, '--puppeteer-launch-options')
  parseJsDataFlag(args, '--screenshot-options')

  return args as typeof args & {
    '--trailing-slash-mode': Config['trailingSlashMode']
    '--puppeteer-launch-mode': Config['puppeteerLaunchMode']['type']
    // No additional runtime validation made
    '--puppeteer-launch-options': Config['puppeteerLaunchMode']['options']
    '--screenshotOptions': Config['screenshotOptions']
  }
}
