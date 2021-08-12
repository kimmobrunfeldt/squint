#!/usr/bin/env node

import puppeteer from 'puppeteer';
import _ from 'lodash';
import { Config, defaultConfig, parseConfig } from './config';
import { createPagePool } from './puppeteer';
import { crawlCommand, compareCommand, screenshotCommand } from './commands';
import { formatHelp } from './cli';

async function main() {
  let config: Config;
  try {
    config = parseConfig()
  } catch (e) {
    console.error(e);
    process.exit(2);
  }

  const browser = await puppeteer[config.puppeteerLaunchMode.type](config.puppeteerLaunchMode.options as any);
  const pagePool = createPagePool(browser, config);

  if (config.command === 'crawl') {
    await crawlCommand(pagePool, config);
  } else if (config.command === 'compare') {
    await compareCommand(pagePool, config);
  } else if (config.command === 'screenshot') {
    await screenshotCommand(pagePool, config);
  } else if (_.isUndefined(config.command)) {
    console.error(formatHelp(defaultConfig));
  } else {
    console.error(`Unknown command: ${config.command}`)
    process.exit(1);
  }

  browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
