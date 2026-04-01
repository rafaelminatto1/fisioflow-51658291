import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import util from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runBuild() {
  try {
    console.log('Starting diagnostic build...');
    await build({
      root: path.resolve(__dirname, 'apps/web'),
      configFile: path.resolve(__dirname, 'apps/web/vite.config.ts'),
      build: {
        write: false, // Don't write to disk
      }
    });
    console.log('Build successful!');
  } catch (err) {
    console.error('BUILD FAILED with error:');
    console.error(util.inspect(err, { showHidden: true, depth: 10, colors: true }));
  }
}

runBuild();
