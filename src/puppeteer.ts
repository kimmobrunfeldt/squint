import genericPool from 'generic-pool'
import { Browser, Page } from 'puppeteer'
import { Config } from './config'

export function createPagePool(browser: Browser, config: Config) {
  const factory = {
    create: async () => {
      const page = await browser.newPage()
      page.setViewport({ width: config.width, height: config.height })

      if (process.env.NODE_ENV === 'test') {
        await page.setDefaultNavigationTimeout(60000)
      }

      return page
    },
    destroy: (page: Page) => page.close(),
  }

  return genericPool.createPool(factory, {
    max: 10,
    min: 1,
  })
}
