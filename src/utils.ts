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


