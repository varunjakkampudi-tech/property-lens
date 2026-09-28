const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../scripts/serve.cjs');

test('development server serves only public site files with safe content types', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const home = await fetch(base + '/');
    assert.equal(home.status, 200);
    assert.match(home.headers.get('content-type'), /text\/html/);
    assert.match(await home.text(), /Property Lens/);

    const script = await fetch(base + '/assets/core.js');
    assert.equal(script.status, 200);
    assert.match(script.headers.get('content-type'), /text\/javascript/);
    assert.equal(script.headers.get('x-content-type-options'), 'nosniff');

    for (const route of ['/README.md', '/.github/workflows/pages.yml', '/scripts/validate-data.cjs', '/does-not-exist']) {
      assert.equal((await fetch(base + route)).status, 404, route);
    }
    assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
    const head = await fetch(base + '/', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
