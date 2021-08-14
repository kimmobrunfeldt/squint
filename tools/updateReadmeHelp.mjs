
function splitOnce(str, on) {
  const [first, ...rest] = str.split(on)
  return [first, rest.length > 0? rest.join(on) : undefined]
}

const help = await $`ts-node src/index.ts --help`;
const readme = await fs.readFile('README.md', { encoding: 'utf-8' });

const [firstPart, tempPart] = splitOnce(readme, '## Usage')
const [usagePart, lastPart] = splitOnce(tempPart, '\n##')

const newReadme = `${firstPart}## Usage\n\n*Auto-generated*\n\n\`\`\`bash${help}\`\`\`\n\n##${lastPart}`;
console.log(newReadme);
await fs.writeFile('README.md', newReadme);