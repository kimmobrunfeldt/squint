import { Pool } from "generic-pool";
import path from 'path';
import fs from 'fs';
import { Page } from "puppeteer";
import { promiseEachSeries } from "./utils";
import { clean, compareUrls, resolveUrl } from "./core/compare";
import { Config } from "./config";
import { crawlPaths, createShouldVisit } from "./core/crawl";
import { screenshot } from './core/screenshot';

export async function crawlCommand(pagePool: Pool<Page>, config: Config) {
  const paths = await crawlPaths({
    pagePool,
    // Use new url as the basis for traversal.
    // This will correctly show new pages that are not yet in the old version
    urlsToVisit: new Set<string>([config.crawlUrl]),
    shouldVisit: createShouldVisit(config.crawlFilters, { baseUrl: config.crawlUrl }),
    ...config,
  });

  [...paths].forEach((urlPath) => console.log(urlPath))
}

export async function compareCommand(pagePool: Pool<Page>, config: Config) {
  console.error('Cleaning output directory ..')
  await clean(config);

  if (config.singlePage) {
    console.error(`Comparing ${config.oldUrl} to ${config.newUrl} ..`)
    await compareUrls(pagePool, config.oldUrl, config.newUrl, config);
  } else {
    await compareMultiMode(pagePool, config);
    console.error(`Saved comparison images to ${path.resolve(config.outDir)}`);
  }
}

async function compareMultiMode(pagePool: Pool<Page>, config: Config) {
  let paths;
  if (config.pathsFile) {
    const content = await fs.promises.readFile(config.pathsFile, { encoding: 'utf-8' });
    paths = content.trim().split('\n').map(line => line.trim()).filter(line => Boolean(line));
  } else {
    paths = await crawlPaths({
      pagePool,
      // Use new url as the basis for traversal.
      // This will correctly show new pages that are not yet in the old version
      urlsToVisit: new Set<string>([config.newUrl]),
      shouldVisit: createShouldVisit(config.crawlFilters, { baseUrl: config.newUrl }),
      ...config,
    });
  }

  await promiseEachSeries(paths, async (urlPath) => {
    console.error(`Comparing ${urlPath} ..`)
    const oldUrl = resolveUrl(config.oldUrl, urlPath);
    const newUrl   = resolveUrl(config.newUrl, urlPath);
    await compareUrls(pagePool, oldUrl, newUrl, config);
  });
}

export async function screenshotCommand(pagePool: Pool<Page>, config: Config) {
  try {
    await fs.promises.mkdir(path.dirname(config.outFile), { recursive: true });
  } catch (e) {
    // ignore
  }

  await screenshot(pagePool, config);

  console.error(`Saved screenshot to ${path.resolve(config.outFile)}`);
}