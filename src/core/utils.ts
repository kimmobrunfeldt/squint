import _ from "lodash";

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