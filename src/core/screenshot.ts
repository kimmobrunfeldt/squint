import { ElementHandle, Page } from 'puppeteer'
import { Pool } from 'generic-pool'
import { Config } from '../config'
import { evalJs } from '../utils'

export async function screenshot(pagePool: Pool<Page>, config: Config) {
  await pagePool.use(async (page) => {
    await takeScreenshot(page, config.screenshotUrl, config.outFile, config)
  })
}

export async function takeScreenshot(
  page: Page,
  url: string,
  outputFile: string,
  config: Config
) {
  await page.goto(url, { waitUntil: 'networkidle2' })

  if (config.js) {
    await evalJs(config.js, page)
  }

  let element: ElementHandle | null = null
  if (config.selector) {
    await page.waitForSelector(config.selector)
    element = await page.$(config.selector)
  } else if (config.selectorJs) {
    element = await evalJs(config.selectorJs, page)
  }

  if (element) {
    await element.screenshot({ path: outputFile, ...config.screenshotOptions })
  } else {
    await page.screenshot({
      path: outputFile,
      fullPage: true,
      ...config.screenshotOptions,
    })
  }
}
