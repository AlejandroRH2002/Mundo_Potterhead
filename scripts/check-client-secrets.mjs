import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

const allowed = new Set(['VITE_WHATSAPP_NUMBER', 'VITE_API_URL']);
const sources = readdirSync('.').filter(name => /^\.env(?:\.|$)/.test(name));
const environments = [...sources.map(file => parseEnv(readFileSync(file, 'utf8'))), process.env];
const secrets = new Set();
for (const env of environments) {
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith('VITE_') && !allowed.has(key)) throw new Error('Variable pública no autorizada: ' + key);
    if (/(PASSWORD|SECRET|DATABASE_URL|ACCESS_KEY|PRIVATE_KEY|BOOTSTRAP_EMAIL|TOKEN)/i.test(key) && value && value.length >= 8) secrets.add(value);
  }
}
if (!existsSync('dist/index.html')) throw new Error('Genera dist antes de comprobar el bundle.');
function inspect(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) inspect(path);
    else {
      if (/^\.env(?:\.|$)|\.(pem|key|sql|map)$/i.test(item.name)) throw new Error('Forbidden private file in dist.');
      const buffer = readFileSync(path);
      if ([...secrets].some(secret => buffer.includes(Buffer.from(secret)) || buffer.includes(Buffer.from(encodeURIComponent(secret))))) throw new Error('Se detectó un secreto en el bundle. No publiques dist.');
    }
  }
}
inspect('dist');
console.log('Bundle verificado: sin valores privados del entorno ni variables VITE_ no autorizadas.');
