import path from 'path';
import glob from 'glob';
import sharp from 'sharp';
import http from 'http';
import { promisify } from 'util';
import { DEBUG, PORT_1, PORT_2, getResourcePath, startFileServer, exec, blinkDiff, getTmpPath, getRandomTmpPath } from "./utils"
import { promiseEachSeries } from '../src/utils';
import _ from 'lodash';

const globAsync = promisify(glob);
const squint = `ts-node src/index.ts ${DEBUG ? '--puppeteer-launch-options "{ headless: false }"' : ''}`;
const baseUrl1 = `http://localhost:${PORT_1}`;
const baseUrl2 = `http://localhost:${PORT_2}`;


jest.setTimeout(120 * 1000);

describe('squint', () => {
  describe('case1', () => {
    let server: http.Server;

    beforeAll(async () => {
      server = await startFileServer(getResourcePath('case1/'), PORT_1);
    });

    afterAll(() => {
      server.close();
    });

    it('screenshot old.html with default save location for screenshot image', async () => {
      await exec(`${squint} screenshot ${baseUrl1}/old`);
      const { diff, result } = await blinkDiff(getResourcePath('case1/img/screenshot/old.png'), '.squint/screenshot.png');
      expect(diff.hasPassed(result.code)).toBe(true);
    })

    it('screenshot new.html with -o save location', async () => {
      const tmpPath = getTmpPath('nonexisting/path/should/be/created/shot.png');
      // Test that --out-file works and creates the path if necessary
      await exec(`${squint} screenshot ${baseUrl1}/new -o ${tmpPath}`);
      const { diff, result } = await blinkDiff(getResourcePath('case1/img/screenshot/new.png'), tmpPath);
      expect(diff.hasPassed(result.code)).toBe(true);
    })

    it('screenshot --out-file', async () => {
      const tmpFile = getRandomTmpPath('nonexisting/path/should/be/created/shot.png');
      await exec(`${squint} screenshot ${baseUrl1}/old --out-file ${tmpFile}`);
      const { diff, result } = await blinkDiff(getResourcePath('case1/img/screenshot/old.png'), tmpFile);
      expect(diff.hasPassed(result.code)).toBe(true);
    })

    it('screenshot --selector', async () => {
      const tmpFile = getRandomTmpPath('nonexisting/path/should/be/created/shot.png');
      await exec(`${squint} screenshot ${baseUrl1}/old --selector 'h1' --out-file ${tmpFile}`);
      const { diff, result } = await blinkDiff(getResourcePath('case1/img/screenshot/old-h1.png'), tmpFile);
      expect(diff.hasPassed(result.code)).toBe(true);
    })

    it('screenshot --selector-js', async () => {
      const tmpFile = getRandomTmpPath('nonexisting/path/should/be/created/shot.png');
      await exec(`${squint} screenshot ${baseUrl1}/old --selector-js '(page) => page.$("h1")' --out-file ${tmpFile}`);
      const { diff, result } = await blinkDiff(getResourcePath('case1/img/screenshot/old-h1-js.png'), tmpFile);
      expect(diff.hasPassed(result.code)).toBe(true);
    })

    it('screenshot with exact -w and -h', async () => {
      await exec(`${squint} screenshot ${baseUrl1}/old -w 100 -h 301`);
      const metadata = await sharp('.squint/screenshot.png').metadata();
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(301);
    })

    it('compare with default save location for diff image', async () => {
      await exec(`${squint} compare ${baseUrl1}/old ${baseUrl1}/new --single-page`);
      const { diff, result } = await blinkDiff(getResourcePath('case1/img/compare/diff.png'), '.squint/diff.png');
      expect(diff.hasPassed(result.code)).toBe(true);
    });
  });

  describe('case2', () => {
    let server: http.Server;
    let server2: http.Server;

    beforeAll(async () => {
      server = await startFileServer(getResourcePath('case2/old/'), PORT_1);
      server2 = await startFileServer(getResourcePath('case2/new/'), PORT_2);
    });

    afterAll(() => {
      server.close();
      server2.close();
    });

    it('compare', async () => {
      const tmpDir = getRandomTmpPath('output/');
      await exec(`${squint} compare ${baseUrl1} ${baseUrl2} --out-dir ${tmpDir}`);
      const files = await globAsync(`${tmpDir}/*.png`);
      await promiseEachSeries(files, async (file) => {
        const basename = path.basename(file);
        const resourcePath = getResourcePath(`case2/img/compare/${basename}`);
        const { diff, result } = await blinkDiff(resourcePath, file);
        expect(diff.hasPassed(result.code)).toBe(true);
      });
    })

    it('crawl', async () => {
      const { stdout } = await exec(`${squint} crawl ${baseUrl2}`);
      const outPaths = _.sortBy(stdout.split('\n'))

      expect(outPaths).toBe(_.sortBy([
        '/',
        '/about-us',
        '/company',
        '/blog',
      ]));
    })

    it('crawl with --include-hash', async () => {
      const { stdout } = await exec(`${squint} crawl ${baseUrl2} --include-hash`);
      const outPaths = _.sortBy(stdout.split('\n'));

      expect(outPaths).toBe(_.sortBy([
        '/',
        '/about-us',
        '/company',
        '/blog',
        '/company#testhash',
      ]));
    })
  })

  describe('case3', () => {
    let server: http.Server;

    beforeAll(async () => {
      server = await startFileServer(getResourcePath('case3/'), PORT_1);
    });

    afterAll(() => {
      server.close();
    });

    it('crawl --max-depth 3', async () => {
      const { stdout } = await exec(`${squint} crawl ${baseUrl1}/0 --max-depth 3`);

      // These should be in order
      const paths = [
        '/0',
        '/1',
        '/2',
        '/3',
      ]

      expect(stdout).toBe(`${paths.join('\n')}\n`);
    })
  })

  describe('case4', () => {
    let server: http.Server;

    beforeAll(async () => {
      server = await startFileServer(getResourcePath('case4/'), PORT_1, {
        // Set exact control over paths
        '/': getResourcePath('case4/index.html'),
        '/test': getResourcePath('case4/test.html'),
        '/test/': getResourcePath('case4/test.html'),
      });
    });

    afterAll(() => {
      server.close();
    });

    it('crawl --trailing-slash-mode preserve', async () => {
      const { stdout } = await exec(`${squint} crawl ${baseUrl1} --trailing-slash-mode preserve`);
      const outPaths = _.sortBy(stdout.split('\n'))

      expect(outPaths).toBe(_.sortBy([
        '/',
        '/test',
        '/test/',
      ]));
    })

    it('crawl --trailing-slash-mode add', async () => {
      const { stdout } = await exec(`${squint} crawl ${baseUrl1} --trailing-slash-mode add`);
      const outPaths = _.sortBy(stdout.split('\n'))

      expect(outPaths).toBe(_.sortBy([
        '/',
        '/test/',
      ]));
    })

    it('crawl --trailing-slash-mode remove', async () => {
      const { stdout } = await exec(`${squint} crawl ${baseUrl1} --trailing-slash-mode remove`);
      const outPaths = _.sortBy(stdout.split('\n'))

      expect(outPaths).toBe(_.sortBy([
        '/',
        '/test',
      ]));
    })
  })

  describe('incorrect usage', () => {
    let server: http.Server;

    beforeAll(async () => {
      server = await startFileServer(getResourcePath('case4/'), PORT_1);
    });

    afterAll(() => {
      server.close();
    });

    it('--trailing-slash-mode', async () => {
      await expect(exec(`${squint} crawl http://example.com --trailing-slash-mode delete`))
        .rejects
        .toThrow();
    });

    it('--puppeteer-launch-mode', async () => {
      await expect(exec(`${squint} crawl http://example.com --puppeteer-launch-mode launsh`))
        .rejects
        .toThrow();
    });

    it('--js syntax', async () => {
      await expect(exec(`${squint} screenshot ${baseUrl1} --js '(page) => (oops'`))
        .rejects
        .toThrow();
    });
  })
})