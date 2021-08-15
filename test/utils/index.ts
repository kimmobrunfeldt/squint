import path from 'path'
import crypto from 'crypto'
import http from 'http'
import express from 'express'
import fs from 'fs'
import { promisify } from 'util'
import BlinkDiff from 'blink-diff'
import child_process from 'child_process'
import BPromise from 'bluebird'
import { mkdirp } from '../../src/utils'

export const PORT_1 = 23010
export const PORT_2 = 23011
export const DEBUG = process.env.DEBUG_TESTS === 'true'

export function log(...args: any) {
  if (!DEBUG) return

  console.log(...args)
}

export function getTmpPath(relativePath: string): string {
  return path.join(__dirname, '../../.tmp/', relativePath)
}

export function getRandomTmpPath(relativePath: string): string {
  const newPath = `${crypto.randomBytes(10).toString('hex')}-${relativePath}`
  return getTmpPath(newPath)
}

export function getResourcePath(name: string) {
  return path.join(__dirname, '../resources', name)
}

export async function startFileServer(
  dirPath: string,
  port: number,
  mapping?: Record<string, string>
) {
  console.log('Serving files from', dirPath, 'at port', port)
  const app = express()

  if (mapping) {
    app.enable('strict routing')

    Object.keys(mapping).forEach((key) => {
      log('GET', key, '->', mapping[key])
      app.use(key, async (req, res) => {
        res.contentType(path.basename(mapping[key]))
        const content = await fs.promises.readFile(mapping[key], {
          encoding: 'utf-8',
        })
        res.send(content)
      })
    })
  } else {
    log('GET *', '->', `${dirPath}*`)
    app.use('/', express.static(dirPath, { extensions: ['html'] }))
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(port)
    server.once('listening', () => resolve(server))
    server.once('error', reject)
  }) as Promise<http.Server>
}

export const exec = promisify(child_process.exec)

export async function blinkDiff(aImgPath: string, bImgPath: string) {
  const tmpPath = getRandomTmpPath('squint-test-diff.png')
  await mkdirp(path.dirname(tmpPath))

  log('Comparing', aImgPath, 'to', bImgPath)
  const diff = new BlinkDiff({
    imageAPath: aImgPath,
    imageBPath: bImgPath,
    thresholdType: BlinkDiff.THRESHOLD_PERCENT,
    // Test cases should render very similar results, but different OS
    // platforms render fonts differently
    threshold: 0.01, // 1%
    imageOutputPath: tmpPath,
  })
  // stdlib util.promisify didn't work
  const promisifiedDiff = BPromise.promisifyAll(diff)
  const result = await promisifiedDiff.runAsync()

  log('Found', result.differences, 'differences')

  if (!DEBUG) {
    await fs.promises.unlink(tmpPath)
  } else {
    log(`Saved diff output to ${tmpPath}`)
  }

  return { diff, result }
}
