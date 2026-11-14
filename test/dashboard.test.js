const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

test("dashboard loads its restored client script through the same-origin proxy", () => {
  const html = readFileSync("index.html", "utf8");
  const script = readFileSync("script.js", "utf8");
  assert.match(html, /<script src="script\.js"><\/script>/);
  assert.match(script, /\/api\/weather\?action=current/);
  assert.match(script, /\/api\/weather\?action=forecast/);
  assert.doesNotMatch(script, /api\.openweathermap\.org|API_KEY/);
});
