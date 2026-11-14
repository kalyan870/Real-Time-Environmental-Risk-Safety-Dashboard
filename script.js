let lat = null, lon = null;
let forecastData = null;

// Live Clock + Date
setInterval(() => {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('liveClock').innerHTML = `${time}<br><small>${date}</small>`;
}, 1000);

// Theme Toggle
document.getElementById('themeToggle').onclick = () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  document.getElementById('themeToggle').innerHTML = isDark
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
};

// Search
function searchFlexibleLocation() {
  let q =
    document.getElementById('city').value.trim() ||
    document.getElementById('district').value.trim() ||
    document.getElementById('state').value.trim() ||
    "Mumbai";
  loadByCity(q);
}

// Location
function getLocationWeather() {
  if (!navigator.geolocation) {
    loadByCity("Mumbai");
    return;
  }
  document.getElementById('loading').classList.remove('hidden');
  navigator.geolocation.getCurrentPosition(
    p => {
      lat = p.coords.latitude;
      lon = p.coords.longitude;
      loadAllData();
    },
    () => loadByCity("Mumbai")
  );
}

function loadByCity(city) {
  document.getElementById('loading').classList.remove('hidden');
  fetch(`/api/weather?action=current&city=${encodeURIComponent(city)}`)
    .then(r => r.json())
    .then(d => {
      if (d.cod === 200) {
        lat = d.coord.lat;
        lon = d.coord.lon;
        loadAllData();
      } else {
        document.getElementById('loading').innerHTML = "City not found";
      }
    })
    .catch(() => {
      document.getElementById('loading').innerHTML = "Network error";
    });
}

// MAIN
function loadAllData() {
  fetch(`/api/weather?action=current&lat=${lat}&lon=${lon}`)
    .then(r => r.json())
    .then(d => {
      document.getElementById('weatherInfo').classList.remove('hidden');
      document.getElementById('currentIcon').innerHTML =
        `<img src="https://openweathermap.org/img/wn/${d.weather[0].icon}@4x.png">`;
      document.getElementById('temp').innerHTML =
        `${Math.round(d.main.temp)}°C<br><small>Feels like ${Math.round(d.main.feels_like)}°C</small>`;
      document.getElementById('minMax').innerHTML =
        `Today: ${Math.round(d.main.temp_min)}° – ${Math.round(d.main.temp_max)}°`;
      document.getElementById('description').textContent = d.weather[0].description;
      document.getElementById('location').innerHTML =
        `${d.name}, ${d.sys.country}<br>
         <small>Sunrise ${new Date(d.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
         • Sunset ${new Date(d.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>`;
      document.getElementById('humidity').textContent = d.main.humidity;
      document.getElementById('wind').textContent = d.wind.speed.toFixed(1);
      document.getElementById('visibility').textContent = (d.visibility / 1000).toFixed(1);

      let uvValue = 0;
      let aqiLevel = 1;

      const uvFetch = fetch(`/api/weather?action=uvi&lat=${lat}&lon=${lon}`)
        .then(r => r.json())
        .then(u => {
          uvValue = u.value;
          const c = uvValue < 3 ? "#2ed573" : uvValue < 7 ? "#ffa502" : "#ff4757";
          document.getElementById('uvBadge').innerHTML =
            `<div style="background:${c};">UV Index: ${uvValue.toFixed(1)}</div>`;
        })
        .catch(() => {
          document.getElementById('uvBadge').innerHTML = "UV N/A";
        });

      const aqiFetch = fetch(`/api/weather?action=air_pollution&lat=${lat}&lon=${lon}`)
        .then(r => r.json())
        .then(aqi => {
          aqiLevel = aqi.list[0].main.aqi;
          const quality = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];
          const colors = ["#2ed573", "#7bed9f", "#ffa502", "#ff6348", "#ff4757"];
          document.getElementById('aqiBadge').innerHTML =
            `<div style="background:${colors[aqiLevel - 1]};">
              Air Quality: ${quality[aqiLevel - 1]}
             </div>`;
        })
        .catch(() => {
          document.getElementById('aqiBadge').innerHTML = "AQI N/A";
        });

      // Clear extra features
      document.getElementById('extraFeatures').innerHTML = '';

      // Wind Direction
      const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
      const deg = d.wind.deg || 0;
      const index = Math.round(deg / 22.5) % 16;
      const windDiv = document.createElement('div');
      windDiv.className = 'extra-feature';
      windDiv.innerHTML = `<strong>🧭 Wind Direction</strong><br>
        <div style="font-size:60px;">${directions[index]} ↑</div>
        Wind from ${directions[index]}`;
      document.getElementById('extraFeatures').appendChild(windDiv);

      // Sunrise & Sunset Bar
      const sunriseTime = new Date(d.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const sunsetTime = new Date(d.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dayLength = Math.floor((d.sys.sunset - d.sys.sunrise) / 3600) + "h " + Math.floor(((d.sys.sunset - d.sys.sunrise) % 3600) / 60) + "m";
      const sunDiv = document.createElement('div');
      sunDiv.className = 'extra-feature';
      sunDiv.innerHTML = `
        <strong>☀️ Sunrise & Sunset</strong><br>
        <div style="display:flex;align-items:center;justify-content:space-between;margin:15px 0;">
          <span>🌅 ${sunriseTime}</span>
          <div style="flex:1;height:10px;background:rgba(255,255,255,0.3);border-radius:10px;margin:0 15px;">
            <div style="width:60%;height:100%;background:linear-gradient(90deg, #ffe66d, #ff9f43);border-radius:10px;"></div>
          </div>
          <span>🌇 ${sunsetTime}</span>
        </div>
        Day length: ${dayLength}
      `;
      document.getElementById('extraFeatures').appendChild(sunDiv);

      // Weather Alerts
      Promise.all([uvFetch, aqiFetch]).then(() => {
        let alerts = [];
        if (d.main.temp > 40) alerts.push("🔥 Heatwave Alert");
        if (d.main.temp < 5) alerts.push("❄️ Cold Wave Alert");
        if (d.weather[0].main.toLowerCase().includes('thunder')) alerts.push("⚡ Thunderstorm Alert");
        if (d.weather[0].main.toLowerCase().includes('rain') && d.wind.speed > 15) alerts.push("🌧️ Heavy Rain & Wind Alert");
        if (uvValue > 8) alerts.push("☀️ Extreme UV Alert");
        if (aqiLevel > 4) alerts.push("😷 Severe Pollution Alert");

        if (alerts.length > 0) {
          document.getElementById('alertBanner').classList.remove('hidden');
          document.getElementById('alertText').textContent = alerts.join(" • ");

          const alertCard = document.createElement('div');
          alertCard.className = 'extra-feature';
          alertCard.style.background = 'linear-gradient(135deg, #ff4757, #c44569)';
          alertCard.style.color = 'white';
          alertCard.style.border = 'none';
          alertCard.innerHTML = `<strong>🚨 Active Weather Alerts</strong><br>${alerts.join("<br>")}`;
          document.getElementById('extraFeatures').insertBefore(alertCard, document.getElementById('extraFeatures').firstChild);
        } else {
          document.getElementById('alertBanner').classList.add('hidden');
        }
      });

      // Health Cautions
      Promise.all([uvFetch, aqiFetch]).then(() => {
        let cautions = [];
        if (d.main.temp > 35) cautions.push("🔥 Extreme heat — stay indoors, drink plenty of water");
        if (d.main.temp < 10) cautions.push("❄️ Cold weather — wear warm layers");
        if (d.main.humidity > 80) cautions.push("💧 High humidity — may cause discomfort");
        if (d.main.humidity < 30) cautions.push("🏜️ Dry air — use moisturizer");
        if (uvValue > 7) cautions.push("☀️ High UV — apply SPF 50+");
        if (aqiLevel > 3) cautions.push("😷 Poor air quality — limit outdoor time");
        if (d.wind.speed > 12) cautions.push("💨 Strong wind — drive carefully");
        if (d.weather[0].main.toLowerCase().includes('rain')) cautions.push("☔ Rain expected — avoid slippery areas");

        if (cautions.length > 0) {
          const cautionDiv = document.createElement('div');
          cautionDiv.className = 'extra-feature';
          cautionDiv.innerHTML = `<strong>⚠️ Health Cautions</strong><br>${cautions.join("<br>")}`;
          document.getElementById('extraFeatures').appendChild(cautionDiv);
        }
      });

      // Live Rain Radar (Windy.com embed — shows real rain data)
      const windyUrl = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&zoom=9&level=radar&overlay=rain&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=°C&radarRange=-1`;
      document.getElementById('windyRadar').src = windyUrl;

      // Forecast
      fetch(`/api/weather?action=forecast&lat=${lat}&lon=${lon}`)
        .then(r => r.json())
        .then(f => {
          forecastData = f.list;

          // 24-Hour Forecast
          let h = document.getElementById('hourlyForecast'); h.innerHTML = "";
          f.list.slice(0,8).forEach(i => {
            h.innerHTML += `<div class="hour-card">
              <div>${new Date(i.dt*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
              <img src="https://openweathermap.org/img/wn/${i.weather[0].icon}@2x.png">
              <div>${Math.round(i.main.temp)}°</div>
              <div class="rain-chance">${Math.round((i.pop||0)*100)}% rain</div>
            </div>`;
          });

          // 5-Day Forecast
          let days = {}, daily = document.getElementById('dailyForecast'); daily.innerHTML = "";
          f.list.forEach(i => {
            let k = new Date(i.dt*1000).toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'short'});
            if (!days[k]) days[k] = {temp: [], icon: {}};
            days[k].temp.push(i.main.temp);
            days[k].icon[i.weather[0].icon] = (days[k].icon[i.weather[0].icon] || 0) + 1;
          });
          Object.keys(days).slice(0,5).forEach(day => {
            let high = Math.round(Math.max(...days[day].temp));
            let low = Math.round(Math.min(...days[day].temp));
            let ic = Object.keys(days[day].icon).sort((a,b)=>days[day].icon[b]-days[day].icon[a])[0];
            daily.innerHTML += `<div class="day-card">
              <div class="day">${day}</div>
              <img src="https://openweathermap.org/img/wn/${ic}@2x.png">
              <div class="temps"><span class="high">${high}°</span> / <span class="low">${low}°</span></div>
            </div>`;
          });

          document.getElementById('loading').classList.add('hidden');
        });
    });
}

// Check If Safe To Go
function checkIfSafeToGo() {
  if (!forecastData) return alert("Weather data not loaded yet");
  let date = document.getElementById('visitDate').value;
  let time = document.getElementById('visitTime').value || "12:00";
  if (!date) return alert("Select date");
  let target = new Date(`${date}T${time}:00`).getTime() / 1000;
  document.getElementById('recommendation').innerHTML = "Checking...";
  document.getElementById('recommendation').className = "";
  let closest = forecastData.reduce((a, b) => Math.abs(a.dt - target) < Math.abs(b.dt - target) ? a : b);
  let t = Math.round(closest.main.temp);
  let r = Math.round((closest.pop || 0) * 100);
  let desc = closest.weather[0].description.toLowerCase();
  let msg, cls;
  if (r > 70 || desc.includes('storm') || desc.includes('thunder')) {
    msg = "DON'T GO<br>Rain/Storm expected";
    cls = "danger";
  } else if (r > 40 || t > 38 || t < 8) {
    msg = "THINK TWICE<br>Heavy rain or extreme temp";
    cls = "warning";
  } else {
    msg = "GOOD TO GO!<br>Pleasant weather";
    cls = "good";
  }
  document.getElementById('recommendation').innerHTML = "<strong>Recommendation</strong><br><br>" + msg;
  document.getElementById('recommendation').className = cls;
}

// Voice Summary
function speakWeather() {
  const text = `Current temperature is ${document.getElementById('temp').innerText}. ${document.getElementById('description').textContent}. In ${document.getElementById('location').innerText}.`;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-IN';
  speechSynthesis.speak(utter);
}

// Save Favorite
function saveCurrentLocation() {
  const name = document.getElementById('location').innerText.split(',')[0].trim();
  let favs = JSON.parse(localStorage.getItem('weatherFavs') || '[]');
  if (!favs.includes(name)) {
    favs.push(name);
    localStorage.setItem('weatherFavs', JSON.stringify(favs));
    alert(name + " saved as favorite!");
  } else alert("Already saved");
}

// Show Favorites
function showFavorites() {
  const favs = JSON.parse(localStorage.getItem('weatherFavs') || '[]');
  if (favs.length === 0) return alert("No favorites yet");
  const choice = prompt("Favorites:\n" + favs.join('\n') + "\n\nType city name to load:");
  if (choice && favs.includes(choice.trim())) {
    document.getElementById('city').value = choice;
    searchFlexibleLocation();
  }
}

// Share
function shareWeather() {
  const text = `Kalyan Live Weather\n${document.getElementById('location').innerText}\n${document.getElementById('temp').innerText}\n${document.getElementById('description').textContent}\n\nCheck: ${location.href}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
}

// Auto load
window.onload = () => getLocationWeather();