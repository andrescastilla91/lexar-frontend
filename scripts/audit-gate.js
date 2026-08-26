// HU-SEC-3: gate real de auditoria de dependencias de produccion.
// Corre `npm audit --omit=dev --audit-level=high --json` y falla si queda
// algun hallazgo high/critical sin una excepcion vigente en
// security/audit-exceptions.json (expiresDate futura). Una excepcion
// vencida vuelve a fallar el build sola, sin revision manual.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const EXCEPTIONS_PATH = path.join(
  __dirname,
  '..',
  'security',
  'audit-exceptions.json',
);

function loadExceptions() {
  if (!fs.existsSync(EXCEPTIONS_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(EXCEPTIONS_PATH, 'utf8'));
  return raw.exceptions || [];
}

function isValid(exception, today) {
  if (!exception.expiresDate) return false;
  return new Date(exception.expiresDate) > today;
}

function run() {
  let stdout;
  try {
    stdout = execSync('npm audit --omit=dev --audit-level=high --json', {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (err) {
    stdout = err.stdout || '';
  }

  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    console.error('No se pudo parsear la salida de `npm audit --json`:');
    console.error(stdout);
    process.exit(1);
  }

  const vulnerabilities = report.vulnerabilities || {};
  const exceptions = loadExceptions();
  const today = new Date();

  const unresolved = Object.entries(vulnerabilities).filter(([, v]) => {
    return v.severity === 'high' || v.severity === 'critical';
  });

  const stillFailing = unresolved.filter(([name]) => {
    const exception = exceptions.find((e) => e.package === name);
    return !(exception && isValid(exception, today));
  });

  if (stillFailing.length > 0) {
    console.error(
      'Auditoria de dependencias (produccion) - hallazgos sin excepcion vigente:',
    );
    for (const [name, v] of stillFailing) {
      const exception = exceptions.find((e) => e.package === name);
      const tag = exception ? ' (excepcion VENCIDA)' : '';
      console.error(`  - ${name} [${v.severity}]${tag}`);
    }
    console.error(
      '\nAgrega una excepcion con expiresDate en security/audit-exceptions.json, o actualiza la dependencia.',
    );
    process.exit(1);
  }

  const total =
    (report.metadata && report.metadata.vulnerabilities && report.metadata.vulnerabilities.total) || 0;
  console.log(
    `OK: sin hallazgos high/critical de produccion sin excepcion vigente (auditoria completa: ${total} hallazgos totales; dev filtrado por --omit=dev).`,
  );
}

run();
