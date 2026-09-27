const endpoints = {
  current: "weather",
  forecast: "forecast",
  uvi: "uvi",
  air_pollution: "air_pollution",
};

function validCoordinates(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "Weather service is not configured." });
  }

  const url = new URL(req.url, "http://localhost");
  const action = url.searchParams.get("action");
  const endpoint = endpoints[action];
  if (!endpoint) return res.status(400).json({ error: "Unsupported weather action." });

  const params = new URLSearchParams({ appid: apiKey });
  if (action === "current" || action === "forecast") params.set("units", "metric");

  if (action === "current" && url.searchParams.has("city")) {
    const city = (url.searchParams.get("city") || "").trim().slice(0, 80);
    if (!city) return res.status(400).json({ error: "Enter a city name." });
    params.set("q", `${city},IN`);
  } else {
    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));
    if (!validCoordinates(lat, lon)) {
      return res.status(400).json({ error: "Valid latitude and longitude are required." });
    }
    params.set("lat", String(lat));
    params.set("lon", String(lon));
  }

  try {
    const upstream = await fetch(`https://api.openweathermap.org/data/2.5/${endpoint}?${params}`);
    const body = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch {
    return res.status(502).json({ error: "Weather provider could not be reached." });
  }
};
