import fs from 'fs';
import _ from "lodash";

// https://github.com/sindresorhus/p-each-series/blob/main/license
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
const PROMISE_EACH_SERIES_STOP = Symbol('promiseEachSeries.stop');

export async function promiseEachSeries<T>(
  iterable: Iterable<T>,
  iterator: (value: T, index: number) => Promise<void | typeof PROMISE_EACH_SERIES_STOP>
) {
  let index = 0;

  for (const value of iterable) {
    // eslint-disable-next-line no-await-in-loop
    const returnValue = await iterator(await value, index++);

    if (returnValue === PROMISE_EACH_SERIES_STOP) {
      break;
    }
  }

  return iterable;
};

export async function evalJs(code: string, ...args: any[]): Promise<any> {
  let result: any;
  const codeToEval = `(() => { return ${code}; })()`;
  try {
    let afterEval = eval(codeToEval);
    if (_.isFunction(afterEval)) {
      result = afterEval(...args);
    } else {
      result = afterEval;
    }
  } catch (e) {
    console.error(`Unable to \`eval\ code: ${e.message}`);
    console.error('Evaluated code:')
    console.error(codeToEval);
    throw e;
  }

  return result;
}

export async function mkdirp(dir: string) {
  try {
    await fs.promises.mkdir(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
}