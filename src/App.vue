<script setup lang="ts">
import { ref, computed } from 'vue'
import { onBeforeUnmount } from 'vue'
import Weather3D from './components/Weather3D.vue'
import { searchCity, getWeather, mapWeatherCode, type CurrentWeather, type GeoResult } from './services/weather'

const query = ref('')
const place = ref<GeoResult | null>(null)
const weather = ref<CurrentWeather | null>(null)
const condition = ref<'clear' | 'clouds' | 'rain' | 'snow' | 'fog'>('clear')
const lastUpdated = ref<number | null>(null)
let refreshId: number | null = null
const wind = computed(() => {
  const w = weather.value?.windSpeed
  if (w == null) return 0
  return weather.value?.source === 'open-meteo' ? w / 3.6 : w
})

async function onSearch() {
  if (!query.value.trim()) return
  place.value = await searchCity(query.value.trim())
  if (!place.value) return
  await refreshWeather()
  startAutoRefresh()
}

function formatTime(s?: number) {
  if (!s) return ''
  return new Date(s * 1000).toLocaleTimeString()
}

async function refreshWeather() {
  if (!place.value) return
  weather.value = await getWeather(place.value.latitude, place.value.longitude)
  if (weather.value) {
    condition.value = mapWeatherCode(weather.value.weatherCode)
    lastUpdated.value = Math.floor(Date.now() / 1000)
  }
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
          <button @click="onSearch" class="rounded-md bg-blue-600 hover:bg-blue-500 px-4 py-2">Search</button>
        </div>
        <div v-if="place && weather" class="space-y-4">
          <p class="text-lg">{{ place.name }}<span v-if="place.country">, {{ place.country }}</span></p>
          <p class="text-5xl font-semibold">{{ Math.round(weather.temperature) }}°C</p>
          <p class="capitalize">{{ weather.description ?? condition }}</p>
          <div class="grid grid-cols-2 gap-3 text-sm text-slate-300">
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Feels like:</span> <span class="text-white">{{ weather.feelsLike != null ? Math.round(weather.feelsLike) + '°C' : '—' }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Humidity:</span> <span class="text-white">{{ weather.humidity != null ? weather.humidity + '%' : '—' }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Wind:</span> <span class="text-white">{{ weather.windSpeed != null ? weather.windSpeed + (weather.source === 'openweather' ? ' m/s' : ' km/h') : '—' }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Pressure:</span> <span class="text-white">{{ weather.pressure != null ? weather.pressure + ' hPa' : '—' }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Clouds:</span> <span class="text-white">{{ weather.cloudCover != null ? weather.cloudCover + '%' : '—' }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Time:</span> <span class="text-white">{{ weather.timestamp ? formatTime(weather.timestamp) : '—' }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Sunrise:</span> <span class="text-white">{{ weather.sunrise ? formatTime(weather.sunrise) : '—' }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Sunset:</span> <span class="text-white">{{ weather.sunset ? formatTime(weather.sunset) : '—' }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3"><span class="text-slate-400">Source:</span> <span class="text-white">{{ weather.source }}</span></div>
            <div class="bg-slate-800/60 rounded-md p-3 col-span-2"><span class="text-slate-400">Last updated:</span> <span class="text-white">{{ lastUpdated ? formatTime(lastUpdated) : '—' }}</span></div>
          </div>
        </div>
        <div v-else class="text-slate-400">Search a city to view weather</div>
      </div>
      <div class="flex justify-center md:justify-end">
        <Weather3D :condition="condition" :wind="wind" />
      </div>
    </div>
  </div>
  
</template>

<style scoped>
</style>
