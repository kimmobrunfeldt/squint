import arg from 'arg';
import fs from 'fs';
import { startFileServer } from '../test/utils';

async function main() {
  const args = arg({
    '--port': Number,
    '-p': '--port',
    '--mapping': String,
    '-m': '--mapping'
  })

  if (!args['--port']) {
    throw new Error('Missing port flag, -p or --port');
  }

  let mapping;
  if (args['--mapping']) {
    try {
      mapping = JSON.parse(await fs.promises.readFile(args['--mapping'], { encoding: 'utf-8' }));
    } catch (e) {
      mapping = JSON.parse(args['--mapping']);
    }
  }

  await startFileServer(args._[0], args['--port'], mapping);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
