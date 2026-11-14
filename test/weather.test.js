const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const handler = require("../api/weather");

const originalKey = process.env.OPENWEATHER_API_KEY;
const originalFetch = global.fetch;

afterEach(() => {
  if (originalKey === undefined) delete process.env.OPENWEATHER_API_KEY;
  else process.env.OPENWEATHER_API_KEY = originalKey;
  global.fetch = originalFetch;
});

function response() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return value; },
  };
}

test("rejects unsupported and inherited action names", async () => {
  process.env.OPENWEATHER_API_KEY = "test-only-key";
  for (const action of ["unknown", "__proto__", "toString"]) {
    const res = response();
    await handler({ method: "GET", url: `/api/weather?action=${action}` }, res);
    assert.equal(res.statusCode, 400);
  }
});

test("rejects non-GET requests", async () => {
  const res = response();
  await handler({ method: "POST", url: "/api/weather?action=current" }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, "GET");
});

test("returns configuration error without an API key", async () => {
  delete process.env.OPENWEATHER_API_KEY;
  const res = response();
  await handler({ method: "GET", url: "/api/weather?action=current&city=Delhi" }, res);
  assert.equal(res.statusCode, 503);
});

test("rejects invalid coordinates before calling the provider", async () => {
  process.env.OPENWEATHER_API_KEY = "test-only-key";
  global.fetch = async () => assert.fail("provider must not be called for invalid coordinates");
  const res = response();
  await handler({ method: "GET", url: "/api/weather?action=air_pollution&lat=91&lon=0" }, res);
  assert.equal(res.statusCode, 400);
});

test("proxies only the fixed provider host and times out", async () => {
  process.env.OPENWEATHER_API_KEY = "test-only-key";
  let requestedUrl;
  let requestOptions;
  global.fetch = async (url, options) => {
    requestedUrl = new URL(url);
    requestOptions = options;
    return { status: 200, json: async () => ({ temperature: 20 }) };
  };
  const res = response();
  await handler({ method: "GET", url: "/api/weather?action=current&city=Delhi" }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.temperature, 20);
  assert.equal(requestedUrl.hostname, "api.openweathermap.org");
  assert.equal(requestedUrl.searchParams.get("q"), "Delhi,IN");
  assert.ok(requestOptions.signal instanceof AbortSignal);
});
