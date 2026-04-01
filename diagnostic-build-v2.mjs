import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runBuild() {
  try {
    console.log('Starting diagnostic build v2...');
    await build({
      root: path.resolve(__dirname, 'apps/web'),
      configFile: path.resolve(__dirname, 'apps/web/vite.config.ts'),
      build: {
        write: false,
      }
    });
  } catch (err) {
    console.error('BUILD FAILED!');
    // Detailed error extraction
    const errorData = {
      message: err.message,
      stack: err.stack,
      name: err.name,
      // Try to get internal Rolldown/Vite errors
      errors: err.errors ? JSON.stringify(err.errors, null, 2) : 'none',
      code: err.code,
      id: err.id,
      plugin: err.plugin,
      hook: err.hook
    };
    console.log(JSON.stringify(errorData, null, 2));
    
    // Also try to inspect the 'errors' property if it's an array
    if (Array.isArray(err.errors)) {
       console.log('Detected errors array, printing first item:');
       console.log(JSON.stringify(err.errors[0], Object.getOwnPropertyNames(err.errors[0]), 2));
    }
  }
}

runBuild();
