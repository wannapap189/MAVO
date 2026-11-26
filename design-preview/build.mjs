import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const dir=new URL('./',import.meta.url);
await fs.mkdir(new URL('preview/',dir),{recursive:true});
await fs.cp(new URL('public/',dir),new URL('preview/',dir),{recursive:true});
await build({absWorkingDir:fileURLToPath(dir),entryPoints:['src/main.tsx'],outfile:'preview/app.js',bundle:true,minify:true,jsx:'automatic',format:'esm',target:['es2022'],define:{'process.env.NODE_ENV':'"production"'},external:['/assets/*'],logLevel:'info'});
console.log('MAVO preview built. Run node server.mjs to open it locally.');
