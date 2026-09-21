/* ═══════════════════════════════════════════
   WEATHER APP — JavaScript
   ═══════════════════════════════════════════ */

const API_KEY = "72cf6989c54217078a3144ea537a3c72";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

/* ── DOM Elements ── */
const $ = (id) => document.getElementById(id);

const elements = {
    cityInput: $("cityInput"),
    searchBtn: $("searchBtn"),
    card: $("card"),
    loading: $("loading"),
    errorMsg: $("errorMsg"),
    weather: $("weather"),
    icon: $("weatherIcon"),
    cityName: $("cityName"),
    temperature: $("temperature"),
    condition: $("condition"),
    humidity: $("humidity"),
    wind: $("wind"),
    statCards: document.querySelectorAll(".stat-card"),
    forecastSection: $("forecastSection"),
    forecastRow: $("forecastRow"),
    placeholder: $("placeholder"),
    light: $("light"),
};

/* ═══════════════════════════════════════════
   INITIALIZATION
   ═══════════════════════════════════════════ */

window.addEventListener("DOMContentLoaded", () => {
    // Reveal the card with a fade-in
    requestAnimationFrame(() => {
        elements.card.classList.add("visible");
    });

    // Search on Enter key
    elements.cityInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") searchWeather();
    });

    // Search on button click
    elements.searchBtn.addEventListener("click", searchWeather);

    // Auto-detect location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
            () => {
                // Geolocation denied — show placeholder
                showPlaceholder();
            }
        );
    } else {
        showPlaceholder();
    }
});

/* ═══════════════════════════════════════════
   SEARCH & FETCH
   ═══════════════════════════════════════════ */

function searchWeather() {
    const city = elements.cityInput.value.trim();
    if (!city) return;
    elements.cityInput.blur();
    fetchWeather(`${BASE_URL}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`);
}

function fetchWeatherByCoords(lat, lon) {
    fetchWeather(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
}

async function fetchWeather(url) {
    showLoading();
    hideError();

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
            showError(data.message || "City not found. Try again.");
            return;
        }

        displayWeather(data);
        fetchForecast(data.coord.lat, data.coord.lon);

    } catch (err) {
        showError("Network error. Check your connection.");
    } finally {
        hideLoading();
    }
}

async function fetchForecast(lat, lon) {
    try {
        const res = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        const data = await res.json();

        if (res.ok) {
            displayForecast(data);
        }
    } catch {
        // Silently fail for forecast
    }
}

/* ═══════════════════════════════════════════
   DISPLAY — Main Weather
   ═══════════════════════════════════════════ */

function displayWeather(data) {
    const weatherType = data.weather[0].main.toLowerCase();
    const isNight = data.dt < data.sys.sunrise || data.dt > data.sys.sunset;

    // Hide placeholder, show weather
    hidePlaceholder();
    elements.weather.classList.add("active");

    // ── Icon with pulse animation ──
    const iconEmoji = getWeatherIcon(weatherType, isNight);
    elements.icon.textContent = iconEmoji;
    elements.icon.classList.remove("pulse");
    void elements.icon.offsetWidth; // Force reflow to restart animation
    elements.icon.classList.add("pulse");

    // ── City name — typing animation ──
    typeText(elements.cityName, data.name);

    // ── Temperature — counter animation ──
    const targetTemp = Math.round(data.main.temp);
    animateCounter(elements.temperature, targetTemp);

    // ── Condition ──
    elements.condition.textContent = data.weather[0].description;

    // ── Stats with staggered fade-in ──
    elements.humidity.querySelector(".stat-value").textContent = `${data.main.humidity}%`;
    elements.wind.querySelector(".stat-value").textContent = `${data.wind.speed} m/s`;

    elements.statCards.forEach((card, i) => {
        card.classList.remove("visible");
        setTimeout(() => {
            card.classList.add("visible");
        }, 300 + i * 150);
    });

    // ── Theme ──
    setTheme(weatherType, isNight);
}

/* ═══════════════════════════════════════════
   DISPLAY — 5-Day Forecast
   ═══════════════════════════════════════════ */

function displayForecast(data) {
    elements.forecastRow.innerHTML = "";
    elements.forecastSection.classList.add("active");

    // Get one entry per day (every 8th item = 24h apart)
    const dailyData = data.list.filter((_, i) => i % 8 === 0).slice(0, 5);

    dailyData.forEach((day, index) => {
        const card = document.createElement("div");
        card.className = "forecast-card";

        const dayName = new Date(day.dt_txt).toLocaleDateString("en-US", {
            weekday: "short",
        });
        const weatherType = day.weather[0].main.toLowerCase();
        const iconEmoji = getWeatherIcon(weatherType, false);
        const temp = Math.round(day.main.temp);

        card.innerHTML = `
            <div class="fc-day">${dayName}</div>
            <div class="fc-icon">${iconEmoji}</div>
            <div class="fc-temp">${temp}°</div>
        `;

        elements.forecastRow.appendChild(card);

        // Staggered fade-in animation
        setTimeout(() => {
            card.classList.add("visible");
        }, 100 + index * 120);
    });
}

/* ═══════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════ */

/**
 * Typing effect — types out text one letter at a time
 */
function typeText(element, text) {
    element.innerHTML = "";
    let i = 0;
    const cursor = document.createElement("span");
    cursor.className = "cursor";

    function type() {
        if (i < text.length) {
            element.textContent = text.substring(0, i + 1);
            element.appendChild(cursor);
            i++;
            setTimeout(type, 60);
        } else {
            // Remove cursor after typing is done
            setTimeout(() => {
                if (cursor.parentNode) cursor.remove();
            }, 1000);
        }
    }

    type();
}

/**
 * Counter animation — counts from 0 (or negative) to target
 */
function animateCounter(element, target) {
    const duration = 800;
    const startTime = performance.now();
    const start = 0;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (target - start) * eased);

        element.textContent = `${current}°C`;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

/* ═══════════════════════════════════════════
   THEME & ICONS
   ═══════════════════════════════════════════ */

function setTheme(type, isNight) {
    const body = document.body;
    body.classList.remove("sunny", "cloudy", "rainy", "night", "snow", "haze");

    const light = elements.light;
    light.className = "light-overlay";

    if (isNight) {
        body.classList.add("night");
        return;
    }

    if (type.includes("clear")) {
        body.classList.add("sunny");
        light.classList.add("light-clear");
    } else if (type.includes("cloud")) {
        body.classList.add("cloudy");
        light.classList.add("light-clouds");
    } else if (type.includes("rain") || type.includes("drizzle")) {
        body.classList.add("rainy");
        light.classList.add("light-rain");
    } else if (type.includes("snow")) {
        body.classList.add("snow");
    } else if (type.includes("haze") || type.includes("mist") || type.includes("fog")) {
        body.classList.add("haze");
    }
}

function getWeatherIcon(type, isNight) {
    if (isNight) return "🌙";
    if (type.includes("clear")) return "☀️";
    if (type.includes("cloud")) return "☁️";
    if (type.includes("rain")) return "🌧️";
    if (type.includes("drizzle")) return "🌦️";
    if (type.includes("thunder")) return "⛈️";
    if (type.includes("snow")) return "❄️";
    if (type.includes("mist") || type.includes("fog") || type.includes("haze")) return "🌫️";
    return "🌡️";
}

/* ═══════════════════════════════════════════
   UI HELPERS
   ═══════════════════════════════════════════ */

function showLoading() {
    elements.loading.classList.add("active");
    elements.weather.classList.remove("active");
    elements.forecastSection.classList.remove("active");
    hidePlaceholder();
}

function hideLoading() {
    elements.loading.classList.remove("active");
}

function showError(message) {
    elements.errorMsg.textContent = message;
    elements.errorMsg.classList.add("active");
    hideLoading();
}

function hideError() {
    elements.errorMsg.classList.remove("active");
}

function showPlaceholder() {
    elements.placeholder.style.display = "block";
}

function hidePlaceholder() {
    elements.placeholder.style.display = "none";
}
