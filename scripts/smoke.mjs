import { runSmoke } from './smoke-lib.mjs';
const args=process.argv.slice(2).filter(arg=>arg!=='--');
let url, apiUrl;
try {
  for (let i=0;i<args.length;i+=2) {
    if (!['--url','--api-url'].includes(args[i]) || !args[i+1]) throw Error('Usage: pnpm smoke -- --url <https://origen> [--api-url <https://api>]');
    if (args[i]==='--url') url=args[i+1]; else apiUrl=args[i+1];
  }
  if (!url) throw Error('Usage: pnpm smoke -- --url <https://origen> [--api-url <https://api>]');
  const result=await runSmoke({url,apiUrl});
  for (const check of result.checks) console.log(check.status.toUpperCase() + ': ' + check.name);
  process.exitCode=result.exitCode;
} catch (error) { console.error(error instanceof Error ? error.message : 'SMOKE_FAILED'); process.exitCode=1; }
