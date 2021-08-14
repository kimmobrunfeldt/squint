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

export function getResourcePath(name: string) {
  return path.join(__dirname, '../resources', name);
}

export async function startFileServer(dirPath: string, port: number) {
  const app = express();
  app.use('/', express.static(dirPath));
  return new Promise((resolve, reject) => {
    let server = app.listen(port);
    server.once('listening', () => resolve(server))
    server.once('error', reject);
  }) as Promise<http.Server>;
}

export const exec = promisify(child_process.exec);

export async function blinkDiff(aImgPath: string, bImgPath: string) {
  const tmpPath = path.join(__dirname, `.squint-test-diff-${crypto.randomBytes(10).toString('hex')}.png`);
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

  await fs.promises.unlink(tmpPath);

  return { diff, result };
}