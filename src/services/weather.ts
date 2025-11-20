export type GeoResult = {
  name: string
  latitude: number
  longitude: number
  country?: string
};

export type CurrentWeather = {
  temperature: number
  weatherCode: number
};

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined

export async function searchCity(name: string): Promise<GeoResult | null> {
  if (API_KEY) {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(name)}&limit=1&appid=${API_KEY}`
    const res = await fetch(url)
    if (!res.ok) return null
    const arr = await res.json()
    const r = arr?.[0]
    if (!r) return null
    return {
      name: r.name,
      latitude: r.lat,
      longitude: r.lon,
      country: r.country,
    }
  } else {
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
}

export async function getWeather(lat: number, lon: number): Promise<CurrentWeather | null> {
  if (API_KEY) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const temp = data?.main?.temp
    const wid = data?.weather?.[0]?.id
    if (typeof temp !== 'number' || typeof wid !== 'number') return null
    return {
      temperature: temp,
      weatherCode: wid,
    }
  } else {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const c = data.current
    if (!c) return null
    return {
      temperature: c.temperature_2m,
      weatherCode: c.weather_code,
    }
  }
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
