<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import Weather3D from './components/Weather3D.vue'
import { searchCity, getWeather, getDailyForecast, mapWeatherCode, type CurrentWeather, type GeoResult, type DailyWeather } from './services/weather'

const query = ref('')
const place = ref<GeoResult | null>(null)
const weather = ref<CurrentWeather | null>(null)
const forecast = ref<DailyWeather[] | null>(null)
const condition = ref<'clear' | 'clouds' | 'rain' | 'snow' | 'fog'>('clear')
const lastUpdated = ref<number | null>(null)
let refreshId: number | null = null
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const units = ref<'metric' | 'imperial'>('metric')
const isImperial = computed(() => units.value === 'imperial')
function toF(v?: number) { return v == null ? null : (v * 9) / 5 + 32 }
function windDisplay(w?: number, src?: 'openweather' | 'open-meteo') {
  if (w == null) return { value: null as number | null, unit: '' }
  if (isImperial.value) {
    const mph = src === 'open-meteo' ? w * 0.621371 : w * 2.23694
    return { value: Math.round(mph), unit: 'mph' }
  }
  if (src === 'open-meteo') return { value: Math.round(w), unit: 'km/h' }
  return { value: Math.round(w), unit: 'm/s' }
}
const icon = computed(() => {
  if (condition.value === 'clear') return '☀️'
  if (condition.value === 'clouds') return '☁️'
  if (condition.value === 'rain') return '🌧️'
  if (condition.value === 'snow') return '❄️'
  return '🌫️'
})

function formatDay(s?: number) {
  if (!s) return ''
  return new Date(s * 1000).toLocaleDateString([], { weekday: 'short' })
}
function iconFor(code: number) {
  const c = mapWeatherCode(code)
  if (c === 'clear') return '☀️'
  if (c === 'clouds') return '☁️'
  if (c === 'rain') return '🌧️'
  if (c === 'snow') return '❄️'
  return '🌫️'
}

async function onSearch() {
  if (!query.value.trim()) return
  errorMessage.value = null
  loading.value = true
  place.value = await searchCity(query.value.trim())
  if (!place.value) {
    errorMessage.value = 'City not found'
    loading.value = false
    return
  }
  try {
    await refreshWeather()
    startAutoRefresh()
  } catch (e) {
    errorMessage.value = 'Failed to fetch weather data'
  } finally {
    loading.value = false
  }
}

function formatTime(s?: number) {
  if (!s) return ''
  return new Date(s * 1000).toLocaleTimeString()
}

async function refreshWeather() {
  if (!place.value) return
  const w = await getWeather(place.value.latitude, place.value.longitude)
  if (w) {
    weather.value = w
    condition.value = mapWeatherCode(w.weatherCode)
    lastUpdated.value = Math.floor(Date.now() / 1000)
  } else {
    errorMessage.value = 'Weather unavailable. Check API key configuration.'
  }
  const f = await getDailyForecast(place.value.latitude, place.value.longitude)
  forecast.value = f
}

function startAutoRefresh() {
  if (refreshId) clearInterval(refreshId)
  refreshId = setInterval(() => { refreshWeather() }, 60000) as unknown as number
}

onBeforeUnmount(() => { if (refreshId) clearInterval(refreshId) })
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
    <div class="max-w-3xl w-full grid md:grid-cols-2 gap-8 items-center">
      <div>
        <h1 class="text-3xl font-bold mb-4">3D Weather</h1>
        <div class="flex gap-2 mb-4">
          <input v-model="query" type="text" placeholder="Enter city"
                 class="flex-1 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button @click="onSearch" :disabled="loading" class="rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2">{{ loading ? 'Searching…' : 'Search' }}</button>
          <div class="flex items-center gap-1">
            <button @click="units = 'metric'" :class="['px-3 py-2 rounded-md', units === 'metric' ? 'bg-slate-700' : 'bg-slate-800']">Metric</button>
            <button @click="units = 'imperial'" :class="['px-3 py-2 rounded-md', units === 'imperial' ? 'bg-slate-700' : 'bg-slate-800']">Imperial</button>
          </div>
        </div>
        <div v-if="errorMessage" class="mb-4 rounded-md border border-red-500 bg-red-600/20 text-red-200 px-3 py-2">{{ errorMessage }}</div>
        <div v-if="place && weather" class="space-y-4">
          <p class="text-lg">{{ place.name }}<span v-if="place.country">, {{ place.country }}</span></p>
          <p class="text-5xl font-semibold">{{ Math.round(isImperial ? toF(weather.temperature) as number : (weather.temperature ?? 0)) }}°{{ isImperial ? 'F' : 'C' }}</p>
          <p class="capitalize text-xl">{{ icon }} {{ weather.description ?? condition }}</p>
          <div class="grid grid-cols-2 gap-3 text-sm text-slate-300">
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Feels like:</span> <span class="text-white">{{ weather.feelsLike != null ? Math.round(isImperial ? toF(weather.feelsLike) as number : weather.feelsLike) + '°' + (isImperial ? 'F' : 'C') : '—' }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Humidity:</span> <span class="text-white">{{ weather.humidity != null ? weather.humidity + '%' : '—' }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Wind:</span> <span class="text-white">{{ weather.windSpeed != null ? windDisplay(weather.windSpeed, weather.source).value + ' ' + windDisplay(weather.windSpeed, weather.source).unit : '—' }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Pressure:</span> <span class="text-white">{{ weather.pressure != null ? weather.pressure + ' hPa' : '—' }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Clouds:</span> <span class="text-white">{{ weather.cloudCover != null ? weather.cloudCover + '%' : '—' }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Time:</span> <span class="text-white">{{ weather.timestamp ? formatTime(weather.timestamp) : '—' }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Sunrise:</span> <span class="text-white">{{ weather.sunrise ? formatTime(weather.sunrise) : '—' }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Sunset:</span> <span class="text-white">{{ weather.sunset ? formatTime(weather.sunset) : '—' }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Source:</span> <span class="text-white">{{ weather.source }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3 col-span-2"><span class="text-slate-400">Last updated:</span> <span class="text-white">{{ lastUpdated ? formatTime(lastUpdated) : '—' }}</span></div>
          </div>
          <div v-if="forecast && forecast.length" class="mt-6">
            <div class="text-left text-slate-300 mb-2">7‑day forecast</div>
            <div class="grid grid-cols-7 gap-2">
              <div v-for="d in forecast" :key="d.date" class="bg-slate-800/60 rounded-md p-2 text-center">
                <div class="text-sm text-slate-300">{{ formatDay(d.date) }}</div>
                <div class="text-xl">{{ iconFor(d.code) }}</div>
                <div class="text-xs text-slate-200">{{ Math.round(isImperial ? toF(d.tmax) as number : d.tmax) }}° / {{ Math.round(isImperial ? toF(d.tmin) as number : d.tmin) }}°</div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-slate-400">Search a city to view weather</div>
      </div>
      <div class="flex justify-center md:justify-end">
        <Weather3D :condition="condition" :wind="weather?.windSpeed" :code="weather?.weatherCode" />
      </div>
    </div>
  </div>
  
</template>

<style scoped>
</style>
