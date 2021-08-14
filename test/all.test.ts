import http from 'http';
import { PORT_1, PORT_2, getResourcePath, startFileServer, exec, blinkDiff } from "./utils"

jest.setTimeout(30000);

const squint = 'ts-node src/index.ts';
const baseUrl1 = `http://localhost:${PORT_1}`;
const baseUrl2 = `http://localhost:${PORT_2}`;

describe('squint', () => {
  describe('case1', () => {
    let server: http.Server;

    beforeAll(async () => {
      server = await startFileServer(getResourcePath('case1/'), PORT_1);
    });

    afterAll(() => {
      server.close();
    });

    it('screenshot old.html', async () => {
      await exec(`${squint} screenshot ${baseUrl1}/old`);
      const { diff, result } = await blinkDiff(getResourcePath('case1/img/screenshot/old.png'), '.squint/screenshot.png');
      expect(diff.hasPassed(result.code)).toBe(true);
    })

    it('screenshot new.html', async () => {
      // Test that --out-file works and creates the path if necessary
      await exec(`${squint} screenshot ${baseUrl1}/new -o .nonexisting/path/should/be/created/shot.png`);
      const { diff, result } = await blinkDiff(getResourcePath('case1/img/screenshot/new.png'), '.nonexisting/path/should/be/created/shot.png');
      expect(diff.hasPassed(result.code)).toBe(true);
    })

    it('compare', async () => {
      await exec(`${squint} compare ${baseUrl1}/old ${baseUrl1}/new --single-page`);
      const { diff, result } = await blinkDiff(getResourcePath('case1/img/compare/diff.png'), '.squint/diff.png');
      expect(diff.hasPassed(result.code)).toBe(true);
    })
  })

  describe('case2', () => {
    let server: http.Server;
    let server2: http.Server;

    beforeAll(async () => {
      server = await startFileServer(getResourcePath('case2/'), PORT_1);
      server2 = await startFileServer(getResourcePath('case2/'), PORT_2);
    });

    afterAll(() => {
      server.close();
      server2.close();
    });

    it('crawl', async () => {
      const { stdout } = await exec(`${squint} crawl ${baseUrl2}`);
      const paths = [
        '/',
        '/about-us',
        '/company',
        '/blog',
      ]

      expect(stdout).toBe(`${paths.join('\n')}\n`);
    })
  })
})