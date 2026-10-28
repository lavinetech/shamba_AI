import { env } from '../config/env.js';

export async function getWeather(location) {
  if (!env.weatherApiKey) throw new Error('Weather service is not configured. Set WEATHER_API_KEY.');
  const url = new URL(`${env.weatherBaseUrl.replace(/\/$/, '')}/weather`);
  url.search = new URLSearchParams({ q: location, appid: env.weatherApiKey, units: 'metric' });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Weather provider returned HTTP ${response.status}`);
  const data = await response.json();
  return { location: data.name, country: data.sys?.country, temperature: data.main?.temp, humidity: data.main?.humidity, windSpeed: data.wind?.speed, condition: data.weather?.[0]?.description, observedAt: new Date().toISOString(), provider: 'OpenWeather' };
}
