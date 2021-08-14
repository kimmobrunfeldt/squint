
import { Page } from 'puppeteer';
import path from 'path';
import slugify from '@sindresorhus/slugify';
import { URL } from 'url'
import BPromise from 'bluebird';
import BlinkDiff from 'blink-diff';
import fs from 'fs';
import { promiseEachSeries } from '../utils';
import { Pool } from 'generic-pool';
import { promisify } from 'util';
import glob from 'glob';
import _ from 'lodash';
import { Config } from '../config';
import { takeScreenshot } from './screenshot';

const slugifyWithCounter = slugify.counter();
const globAsync = promisify(glob);


async function mkdirp(dir: string) {
  try {
    await fs.promises.mkdir(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

export async function clean(config: Config) {
  const pattern = path.join(config.outDir, '*.png');
  const files = await globAsync(pattern);
  await promiseEachSeries(files, async (filePath) => {
    try {
      await fs.promises.unlink(filePath)
    } catch (e) {
      // ignore
    }
  });

  await mkdirp(config.outDir);
}

export async function compareUrls(pagePool: Pool<Page>, oldUrl: string, newUrl: string, config: Config) {
  const pathname = new URL(newUrl).pathname;
  const makePath = (version: string) => path.join(config.outDir, `${slugifyWithCounter(`${version}-${pathname}`)}.png`)

  // Slufigy only once per iteration, to not increase slug counter inside one page diff
  const paths = {
    a: makePath('a'),
    b: makePath('b'),
    diff: makePath('diff'),
  }

  await pagePool.use(async (page) => {
    await takeScreenshot(page, oldUrl, paths.a, config);
    await takeScreenshot(page, newUrl, paths.b, config);

    const diff = new BlinkDiff({
      imageAPath: paths.a,
      imageBPath: paths.b,
      thresholdType: BlinkDiff.THRESHOLD_PERCENT,
      threshold: 0.02,
      imageOutputPath: paths.diff,
    });
    // stdlib util.promisify didn't work
    const promisifiedDiff = BPromise.promisifyAll(diff);
    const result = await promisifiedDiff.runAsync();

    await fs.promises.unlink(paths.a);
    await fs.promises.unlink(paths.b);

    if (!config.saveAll && result.differences < 1) {
      console.error(`Found ${result.differences} differences. No diff image saved.`);
      await fs.promises.unlink(paths.diff);
    } else if (config.singlePage && config.outFile) {
      await mkdirp(path.dirname(config.outFile));
      await fs.promises.rename(paths.diff, config.outFile);
      console.error(`Found ${result.differences} differences. Diff image saved to ${path.resolve(config.outFile)}`);
    } else {
      console.error(`Found ${result.differences} differences. Diff image saved to ${paths.diff}`);
    }
  });
}