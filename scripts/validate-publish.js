'use strict';

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const WEB_ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.VALIDATION_PORT || 22334);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const STARTUP_TIMEOUT_MS = 15000;
const CHECKS = [
  ['validate:directory', 'scripts/validate-directory.js'],
  ['validate:county-cuisines', 'scripts/validate-county-cuisines.js'],
  ['validate:cross-county', 'scripts/validate-cross-county.js'],
  ['validate:seo', 'scripts/validate-seo.js'],
  ['validate:search-readiness', 'scripts/validate-search-readiness.js'],
  ['validate:metadata', 'scripts/validate-metadata.js'],
  ['validate:content-evidence', 'scripts/test-content-evidence.js'],
  ['validate:images', 'scripts/validate-image-assets.js'],
  ['validate:contact-delivery', 'scripts/validate-contact-delivery.js'],
  ['validate:sources', 'scripts/validate-sources.js'],
  ['validate:assistant', 'scripts/validate-assistant.js']
];

function waitForServer(server) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const deadline = Date.now() + STARTUP_TIMEOUT_MS;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearInterval(timer);
      error ? reject(error) : resolve();
    };

    const probe = () => {
      const request = http.get(`${BASE_URL}/robots.txt`, response => {
        response.resume();
        if (response.statusCode >= 200 && response.statusCode < 500) finish();
        else retry();
      });
      request.on('error', retry);
      request.setTimeout(1000, () => {
        request.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() >= deadline) {
        finish(new Error(`local server did not become ready at ${BASE_URL} within ${STARTUP_TIMEOUT_MS}ms`));
      }
    };

    const timer = setInterval(probe, 250);
    server.once('error', error => finish(new Error(`local validation server failed: ${error.message}`)));
    server.once('exit', code => {
      if (!settled) finish(new Error(`local validation server exited before checks started (code ${code ?? 'unknown'})`));
    });
    probe();
  });
}

function runCheck(name, script, env) {
  return new Promise(resolve => {
    console.log(`\n=== ${name} ===`);
    const check = spawn(process.execPath, [script], {
      cwd: WEB_ROOT,
      env,
      stdio: 'inherit'
    });
    check.on('error', error => {
      console.error(`${name} could not start: ${error.message}`);
      resolve(false);
    });
    check.on('exit', (code, signal) => {
      if (code === 0) {
        console.log(`${name} passed.`);
        resolve(true);
        return;
      }
      console.error(`${name} failed${signal ? ` (${signal})` : ` with exit code ${code ?? 'unknown'}`}.`);
      resolve(false);
    });
  });
}

async function main() {
  const validationServer = spawn(process.execPath, ['server.js'], {
    cwd: WEB_ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      RESEND_API_KEY: '',
      EVENT_INQUIRY_RECIPIENT: 'validation-only@example.invalid'
    },
    stdio: 'inherit'
  });

  try {
    console.log(`Publish validation: starting local server at ${BASE_URL}`);
    await waitForServer(validationServer);

    const env = {
      ...process.env,
      PORT: String(PORT),
      DIRECTORY_URL: BASE_URL,
      RESEND_API_KEY: '',
      EVENT_INQUIRY_RECIPIENT: 'validation-only@example.invalid'
    };
    const results = [];
    for (const [name, script] of CHECKS) {
      results.push(await runCheck(name, script, env));
    }

    const failed = CHECKS.filter((_, index) => !results[index]).map(([name]) => name);
    if (failed.length) {
      console.error(`\nPublish validation failed. Publishing is blocked until these checks pass: ${failed.join(', ')}.`);
      process.exitCode = 1;
    } else {
      console.log(`\nPublish validation passed: all ${CHECKS.length} validation groups completed successfully (${CHECKS.map(([name]) => name).join(', ')}).`);
    }
  } finally {
    validationServer.kill('SIGTERM');
  }
}

main().catch(error => {
  console.error(`Publish validation could not run: ${error.message}`);
  process.exitCode = 1;
});
