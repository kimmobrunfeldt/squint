import genericPool from 'generic-pool'
import { Browser, Page } from 'puppeteer'
import { Config } from './config'
import { evalJs } from './utils'

export function createPagePool(browser: Browser, config: Config) {
  const factory = {
    create: async () => {
      const page = await browser.newPage()
      page.setViewport({ width: config.width, height: config.height })

      if (config.afterPage) {
        await evalJs(config.afterPage, page)
      }

      return page
    },
    destroy: (page: Page) => page.close(),
  }

  return genericPool.createPool(factory, {
    max: config.puppeteerPagePoolMax,
    min: 1,
  })
}
