export type GeoResult = {
  name: string
  latitude: number
  longitude: number
  country?: string
};

export type CurrentWeather = {
  temperature: number
  weatherCode: number
  description?: string
  feelsLike?: number
  humidity?: number
  windSpeed?: number
  pressure?: number
  cloudCover?: number
  sunrise?: number
  sunset?: number
  timestamp?: number
  source: 'openweather' | 'open-meteo'
};

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined

export async function searchCity(name: string): Promise<GeoResult | null> {
  if (API_KEY) {
    try {
      const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(name)}&limit=1&appid=${API_KEY}`
      const res = await fetch(url)
      if (res.ok) {
        const arr = await res.json()
        const r = arr?.[0]
        if (r) {
          return {
            name: r.name,
            latitude: r.lat,
            longitude: r.lon,
            country: r.country,
          }
        }
      }
    } catch {}
  }
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const r = data.results?.[0]
  if (!r) return null
  return {
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
  }
}

export async function getWeather(lat: number, lon: number): Promise<CurrentWeather | null> {

  if (API_KEY) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        const temp = data?.main?.temp
        const wid = data?.weather?.[0]?.id
        if (typeof temp === 'number' && typeof wid === 'number') {
          let cw: CurrentWeather = {
            temperature: temp,
            weatherCode: wid,
            description: data?.weather?.[0]?.description,
            feelsLike: data?.main?.feels_like,
            humidity: data?.main?.humidity,
            windSpeed: data?.wind?.speed,
            pressure: data?.main?.pressure,
            cloudCover: data?.clouds?.all,
            sunrise: data?.sys?.sunrise,
            sunset: data?.sys?.sunset,
            timestamp: data?.dt,
            source: 'openweather',
          }
          const needExtra = cw.humidity == null || cw.pressure == null || cw.windSpeed == null || cw.cloudCover == null || cw.sunrise == null || cw.sunset == null
          if (needExtra) {
            const oneUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
            const oneRes = await fetch(oneUrl)
            if (oneRes.ok) {
              const one = await oneRes.json()
              const cur = one?.current
              if (cur) {
                cw.humidity = cw.humidity ?? cur.humidity
                cw.pressure = cw.pressure ?? cur.pressure
                cw.windSpeed = cw.windSpeed ?? cur.wind_speed
                cw.cloudCover = cw.cloudCover ?? cur.clouds
                cw.sunrise = cw.sunrise ?? one?.daily?.[0]?.sunrise ?? cur.sunrise
                cw.sunset = cw.sunset ?? one?.daily?.[0]?.sunset ?? cur.sunset
              }
            }
          }
          return cw
        }
      }
    } catch {}
  }
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,apparent_temperature,cloud_cover,time&daily=sunrise,sunset&hourly=pressure_msl,surface_pressure&forecast_days=1&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const c = data.current
  if (!c) return null
  const daily = data.daily
  const hourly = data.hourly
  const sunrise = Array.isArray(daily?.sunrise) ? Math.floor(Date.parse(daily.sunrise[0]) / 1000) : undefined
  const sunset = Array.isArray(daily?.sunset) ? Math.floor(Date.parse(daily.sunset[0]) / 1000) : undefined
  let pressure: number | undefined = undefined
  let timestamp: number | undefined = undefined
  if (c.time) {
    timestamp = Math.floor(Date.parse(c.time) / 1000)
  }
  if (Array.isArray(hourly?.time)) {
    const toEpoch = (t: string) => Math.floor(Date.parse(t) / 1000)
    const currentEpoch = timestamp
    let nearestIdx = -1
    if (currentEpoch != null) {
      let bestDelta = Number.POSITIVE_INFINITY
      for (let i = 0; i < hourly.time.length; i++) {
        const d = Math.abs(toEpoch(hourly.time[i]) - currentEpoch)
        if (d < bestDelta) {
          bestDelta = d
          nearestIdx = i
        }
      }
    } else {
      nearestIdx = 0
    }
    if (nearestIdx >= 0) {
      if (Array.isArray(hourly?.pressure_msl)) {
        pressure = hourly.pressure_msl[nearestIdx]
      }
      if (pressure == null && Array.isArray(hourly?.surface_pressure)) {
        pressure = hourly.surface_pressure[nearestIdx]
      }
    }
  }
  const description = describeOpenMeteoCode(c.weather_code)
  return {
    temperature: c.temperature_2m,
    weatherCode: c.weather_code,
    description,
    feelsLike: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    windSpeed: c.wind_speed_10m,
    pressure,
    cloudCover: c.cloud_cover,
    sunrise,
    sunset,
    timestamp,
    source: 'open-meteo',
  }
}

function describeOpenMeteoCode(code: number): string | undefined {
  const map: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Rain showers',
    81: 'Rain showers',
    82: 'Violent rain showers',
    85: 'Snow showers',
    86: 'Snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  }
  return map[code]
}

export function mapWeatherCode(code: number): 'clear' | 'clouds' | 'rain' | 'snow' | 'fog' {
  if (code >= 200 && code < 300) return 'rain'
  if (code >= 300 && code < 500) return 'rain'
  if (code >= 500 && code < 600) return 'rain'
  if (code >= 600 && code < 700) return 'snow'
  if (code >= 700 && code < 800) return 'fog'
  if (code === 800) return 'clear'
  if (code > 800 && code < 900) return 'clouds'

  if ([0, 1].includes(code)) return 'clear'
  if ([2, 3].includes(code)) return 'clouds'
  if ([45, 48].includes(code)) return 'fog'
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'rain'
  if ([71, 73, 75, 85, 86].includes(code)) return 'snow'
  return 'clouds'
}