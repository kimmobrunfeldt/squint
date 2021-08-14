import path from 'path';
import crypto from 'crypto';
import http from 'http';
import express from 'express';
import fs from 'fs';
import { promisify } from 'util';
import BlinkDiff from 'blink-diff';
import child_process from 'child_process';
import BPromise from 'bluebird';

export const PORT_1 = 10000;
export const PORT_2 = 10001;
export const DEBUG = process.env.DEBUG_TESTS === 'true';

export function getTmpPath(relativePath: string): string {
  return path.join(__dirname, '../../.tmp/', relativePath);
}

export function getRandomTmpPath(relativePath: string): string {
  const newPath = `${crypto.randomBytes(10).toString('hex')}-${relativePath}`;
  return getTmpPath(newPath);
}

export function getResourcePath(name: string) {
  return path.join(__dirname, '../resources', name);
}

export async function startFileServer(dirPath: string, port: number, mapping?: Record<string, string>) {
  console.log('Serving files from', dirPath, 'at port', port);
  const app = express();

  if (mapping) {
    app.enable('strict routing');

    Object.keys(mapping).forEach(key => {
      console.log('GET', key, '->', mapping[key]);
      app.use(key, async (req, res) => {
        res.contentType(path.basename(mapping[key]));
        const content = await fs.promises.readFile(mapping[key], { encoding: 'utf-8' });
        res.send(content);
      });
    });
  } else {
    console.log('GET *', '->', `${dirPath}*`);
    app.use('/', express.static(dirPath, { extensions: ['html'] }));
  }

  return new Promise((resolve, reject) => {
    let server = app.listen(port);
    server.once('listening', () => resolve(server))
    server.once('error', reject);
  }) as Promise<http.Server>;
}

export const exec = promisify(child_process.exec);

export async function blinkDiff(aImgPath: string, bImgPath: string) {
  const tmpPath = getRandomTmpPath('squint-test-diff.png');
  console.log('Comparing', aImgPath, 'to', bImgPath);
  const diff = new BlinkDiff({
    imageAPath: aImgPath,
    imageBPath: bImgPath,
    thresholdType: BlinkDiff.THRESHOLD_PERCENT,
    // Very low because test cases should render very similar results
    threshold: 0.0001,
    imageOutputPath: tmpPath,
  });
  // stdlib util.promisify didn't work
  const promisifiedDiff = BPromise.promisifyAll(diff);
  const result = await promisifiedDiff.runAsync();

  if (!DEBUG) {
    await fs.promises.unlink(tmpPath);
  } else {
    console.log(`Saved diff output to ${tmpPath}`);
  }

  console.log('Found', result.differences, 'differences');

  return { diff, result };
}