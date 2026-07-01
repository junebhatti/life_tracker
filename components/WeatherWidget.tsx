"use client";

import { useEffect, useState } from "react";

type Weather = { tempF: number; code: number; city: string };

/** Maps a WMO weather code (what Open-Meteo returns) to a short, plain-text condition. */
function weatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code >= 96 && code <= 99) return "Thunderstorm";
  return "—";
}

/** Live local time + current conditions for wherever the browser says you are.
 *  Uses keyless, browser-side APIs (Open-Meteo for weather, BigDataCloud / ipapi for the city). */
export default function WeatherWidget() {
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live clock — seeded after mount (client only, to avoid a hydration mismatch) then ticking.
  useEffect(() => {
    const seed = setTimeout(() => setNow(new Date()), 0);
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => {
      clearTimeout(seed);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFromCoords(lat: number, lon: number, cityHint?: string) {
      const wRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`,
      );
      if (!wRes.ok) throw new Error("weather");
      const w = await wRes.json();

      let city = cityHint;
      if (!city) {
        try {
          const gRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
          );
          const g = await gRes.json();
          city = g.city || g.locality || g.principalSubdivision;
        } catch {
          // City is a nicety; weather still shows without it.
        }
      }

      if (!cancelled) {
        setWeather({
          tempF: Math.round(w.current.temperature_2m),
          code: w.current.weather_code,
          city: city || "Your area",
        });
      }
    }

    // No precise location (denied/unavailable): fall back to coarse IP-based location.
    function loadFromIP() {
      fetch("https://ipapi.co/json/")
        .then((r) => r.json())
        .then((d) => {
          if (d.latitude && d.longitude) {
            return loadFromCoords(d.latitude, d.longitude, d.city);
          }
          throw new Error("ip");
        })
        .catch(() => {
          if (!cancelled) setError("Couldn't determine your location.");
        });
    }

    // Use IP-based location only — avoids the repeated browser permission prompt.
    loadFromIP();

    return () => {
      cancelled = true;
    };
  }, []);

  const time = now?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <section>
      <p className="text-[11px] uppercase tracking-wider text-muted">
        {weather?.city ?? (error ? "Weather" : "Locating…")}
      </p>

      <div className="mt-1 flex items-baseline gap-3">
        <p className="text-3xl font-semibold tracking-tight text-foreground">
          {time ?? <span className="inline-block h-7 w-24 animate-pulse rounded bg-hover align-middle" />}
        </p>

        {weather ? (
          <p className="text-sm text-foreground">
            <span className="text-xl font-medium">{weather.tempF}°</span>
            <span className="ml-2 text-muted">{weatherLabel(weather.code)}</span>
          </p>
        ) : error ? (
          <p className="text-xs text-muted">{error}</p>
        ) : (
          <div className="h-6 w-20 animate-pulse rounded bg-hover" />
        )}
      </div>
    </section>
  );
}
