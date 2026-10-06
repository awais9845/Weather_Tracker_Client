import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/Axio";

// Icons
import {
  Search,
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  Eye,
  Cloud,
  CloudRain,
  Sun,
  Sunrise,
  Sunset,
  RefreshCw,
  AlertTriangle,
  Calendar,
  TrendingUp,
  CloudSun,
  Compass,
  ArrowUpRight,
  LogOut,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Chart Components
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

// Chart Configuration
const chartConfig = {
  temperature: {
    label: "Temperature",
    color: "#3b82f6", // Blue
  },
  feelsLike: {
    label: "Feels Like",
    color: "#06b6d4", // Cyan
  },
};

// Popular Quick Search Cities
const POPULAR_CITIES = [
  "Peshawar",
  "London",
  "New York",
  "Tokyo",
  "Paris",
  "Sydney",
  "Dubai",
];

const Weather = () => {
  const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      const response = await api.post("/auth/logout");
      console.log(response.data);
      navigate("/login");
    } catch (error) {
      console.error(
        "Logout failed:",
        error.response?.data?.message || error.message,
      );
    }
  };

  // State
  const [cityInput, setCityInput] = useState("");
  const [currentCity, setCurrentCity] = useState("Peshawar");
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unit, setUnit] = useState("C"); // 'C' or 'F'
  const [timeRange, setTimeRange] = useState("24h"); // '24h', '3d', '5d'

  // Helper: Temperature converter
  const convertTemp = useCallback(
    (tempC) => {
      if (tempC === undefined || tempC === null) return 0;
      if (unit === "F") {
        return Math.round((tempC * 9) / 5 + 32);
      }
      return Math.round(tempC);
    },
    [unit],
  );

  // Fetch Weather Data from Backend
  const fetchWeather = useCallback(
    async (targetCity) => {
      if (!targetCity || !targetCity.trim()) return;

      setLoading(true);
      setError(null);

      try {
        const response = await api.post("/weather/getCondition", {
          city: targetCity.trim(),
        });

        if (response.data && response.data.success && response.data.weather) {
          setWeatherData(response.data.weather);
          setCurrentCity(targetCity.trim());
        } else {
          setError(response.data?.message || "Failed to fetch weather data.");
        }
      } catch (err) {
        console.error("Weather fetch error:", err);

        if (err.response?.status === 401) {
          // Unauthorized -> redirect to login
          navigate("/login");
          return;
        }

        let backendMessage = "Could not load weather information.";

        if (err.code === "ERR_NETWORK" || !err.response) {
          backendMessage =
            "Cannot connect to backend server. Please make sure the backend server (port 3000) is running.";
        } else {
          backendMessage =
            err.response?.data?.message ||
            err.response?.data?.error ||
            err.message ||
            "Could not load weather information. Please check the city name.";
        }

        setError(backendMessage);
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );

  // Initial fetch on component mount
  useEffect(() => {
    fetchWeather("Peshawar");
  }, [fetchWeather]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (cityInput.trim()) {
      fetchWeather(cityInput);
    }
  };

  // Helper: Wind direction degrees to cardinal compass
  const getWindCardinal = (deg) => {
    if (deg === undefined || deg === null) return "N/A";
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round((deg % 360) / 45) % 8;
    return directions[index];
  };

  // Helper: Unix timestamp to time string
  const formatUnixTime = (timestamp, timezoneOffset = 0) => {
    if (!timestamp) return "N/A";
    const date = new Date((timestamp + timezoneOffset) * 1000);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  };

  // Helper: Get Icon component fallback based on condition
  const getConditionIcon = (mainCondition) => {
    switch (mainCondition?.toLowerCase()) {
      case "clear":
        return <Sun className="h-8 w-8 text-amber-500" />;
      case "clouds":
        return <Cloud className="h-8 w-8 text-blue-400" />;
      case "rain":
      case "drizzle":
        return <CloudRain className="h-8 w-8 text-sky-400" />;
      case "snow":
        return <Cloud className="h-8 w-8 text-indigo-300" />;
      case "thunderstorm":
        return <CloudRain className="h-8 w-8 text-purple-400" />;
      default:
        return <CloudSun className="h-8 w-8 text-amber-400" />;
    }
  };

  // Prepare Real Weather Chart Data from backend response
  const chartData = useMemo(() => {
    if (!weatherData?.list) return [];

    let rawList = weatherData.list;
    if (timeRange === "24h") {
      rawList = weatherData.list.slice(0, 8); // 8 items x 3h = 24 hours
    } else if (timeRange === "3d") {
      rawList = weatherData.list.slice(0, 24); // 24 items x 3h = 72 hours
    } else if (timeRange === "5d") {
      rawList = weatherData.list; // All items (40 items = 5 days)
    }

    return rawList.map((item) => {
      const dt = new Date(item.dt * 1000);

      const timeLabel =
        timeRange === "24h"
          ? dt.toLocaleTimeString([], { hour: "numeric", hour12: true })
          : `${dt.toLocaleDateString([], { weekday: "short" })} ${dt.toLocaleTimeString([], { hour: "numeric", hour12: true })}`;

      const fullLabel = `${dt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} at ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

      return {
        formattedTime: timeLabel,
        fullDate: fullLabel,
        temperature: convertTemp(item.main.temp),
        feelsLike: convertTemp(item.main.feels_like),
        condition: item.weather[0]?.main || "Clear",
        humidity: item.main.humidity,
      };
    });
  }, [weatherData, timeRange, convertTemp]);

  // Aggregate Daily Forecast (5 Days)
  const dailyForecast = useMemo(() => {
    if (!weatherData?.list) return [];

    const daysMap = {};

    weatherData.list.forEach((item) => {
      const dateStr = item.dt_txt.split(" ")[0]; // YYYY-MM-DD
      if (!daysMap[dateStr]) {
        daysMap[dateStr] = [];
      }
      daysMap[dateStr].push(item);
    });

    return Object.keys(daysMap)
      .slice(0, 5)
      .map((dateStr) => {
        const items = daysMap[dateStr];
        const dateObj = new Date(dateStr);

        // Calculate min/max temp
        let minTemp = Infinity;
        let maxTemp = -Infinity;
        items.forEach((it) => {
          if (it.main.temp_min < minTemp) minTemp = it.main.temp_min;
          if (it.main.temp_max > maxTemp) maxTemp = it.main.temp_max;
        });

        // Pick mid-day forecast item (around 12:00) or first item
        const midItem =
          items.find((it) => it.dt_txt.includes("12:00:00")) || items[0];

        return {
          dateStr,
          dayName: dateObj.toLocaleDateString([], { weekday: "short" }),
          fullDate: dateObj.toLocaleDateString([], {
            month: "short",
            day: "numeric",
          }),
          minTemp: convertTemp(minTemp),
          maxTemp: convertTemp(maxTemp),
          condition: midItem.weather[0]?.main || "Clear",
          description: midItem.weather[0]?.description || "",
          icon: midItem.weather[0]?.icon || "01d",
          pop: Math.round((midItem.pop || 0) * 100),
          humidity: midItem.main.humidity,
        };
      });
  }, [weatherData, convertTemp]);

  // Current weather values
  const currentItem = weatherData?.list?.[0];
  const cityInfo = weatherData?.city;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <CloudSun className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                WeatherTracker
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Real-Time Weather Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Unit Toggle Button */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setUnit("C")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  unit === "C"
                    ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                °C
              </button>
              <button
                type="button"
                onClick={() => setUnit("F")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  unit === "F"
                    ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                °F
              </button>
            </div>

            {/* Logout / Login link */}
            <Button
              variant="outline"
              onClick={handleLogout}
              size="sm"
              className="gap-1.5 text-xs border-slate-200 dark:border-slate-800"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 space-y-6">
        {/* Search Header Section */}
        <section className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Dashboard
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Explore real-time weather analytics and 5-day forecasts.
              </p>
            </div>

            {/* Search Form */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex w-full md:max-w-md items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search city (e.g. London, Tokyo)..."
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  className="pl-9 pr-4 h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 shadow-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !cityInput.trim()}
                className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm shadow-blue-500/20 shrink-0"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Search</span>
                )}
              </Button>
            </form>
          </div>

          {/* Quick City Selector Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-blue-500" /> Popular:
            </span>
            {POPULAR_CITIES.map((c) => (
              <Badge
                key={c}
                variant={
                  currentCity.toLowerCase() === c.toLowerCase()
                    ? "default"
                    : "outline"
                }
                className={`cursor-pointer transition-all hover:scale-105 py-1 px-3 text-xs ${
                  currentCity.toLowerCase() === c.toLowerCase()
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "hover:bg-slate-200 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800"
                }`}
                onClick={() => {
                  setCityInput(c);
                  fetchWeather(c);
                }}
              >
                {c}
              </Badge>
            ))}
          </div>
        </section>

        {/* Error Alert Card */}
        {error && (
          <Card className="border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20 text-red-900 dark:text-red-300">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div className="flex-1 text-sm font-medium">{error}</div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchWeather(currentCity || "London")}
                className="shrink-0 border-red-200 dark:border-red-800 text-xs hover:bg-red-100 dark:hover:bg-red-900/40"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Skeleton Loading State */}
        {loading && !weatherData && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Skeleton className="h-64 rounded-2xl md:col-span-2" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        )}

        {/* Main Dashboard Grid */}
        {weatherData && currentItem && (
          <>
            {/* Top Grid: Current Weather Hero Card + Day Details */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Current Weather Card */}
              <Card className="lg:col-span-2 overflow-hidden border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-xl relative">
                {/* Decorative background glow */}
                <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />

                <CardContent className="p-6 sm:p-8 flex flex-col justify-between min-h-[300px] relative z-10">
                  {/* Location & Time */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-blue-200" />
                        <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
                          {cityInfo?.name}, {cityInfo?.country}
                        </h3>
                      </div>
                      <p className="text-xs text-blue-100 mt-1 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(currentItem.dt * 1000).toLocaleDateString(
                          [],
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </p>
                    </div>

                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md px-3 py-1 text-xs capitalize">
                      {currentItem.weather[0]?.description}
                    </Badge>
                  </div>

                  {/* Temperature & Weather Graphic */}
                  <div className="my-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-extrabold tracking-tight sm:text-7xl">
                        {convertTemp(currentItem.main.temp)}°
                      </span>
                      <span className="text-2xl font-medium text-blue-200">
                        {unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 bg-white/10 p-3.5 rounded-2xl backdrop-blur-md border border-white/15">
                      {currentItem.weather[0]?.icon ? (
                        <img
                          src={`https://openweathermap.org/img/wn/${currentItem.weather[0].icon}@2x.png`}
                          alt={currentItem.weather[0]?.description}
                          className="h-16 w-16 drop-shadow-md"
                        />
                      ) : (
                        getConditionIcon(currentItem.weather[0]?.main)
                      )}
                      <div>
                        <div className="text-lg font-semibold leading-tight">
                          {currentItem.weather[0]?.main}
                        </div>
                        <div className="text-xs text-blue-100 mt-0.5">
                          Feels like {convertTemp(currentItem.main.feels_like)}°
                          {unit}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/15 text-xs text-blue-100">
                    <div>
                      <span className="opacity-75 block">High / Low</span>
                      <span className="font-semibold text-sm text-white">
                        {convertTemp(currentItem.main.temp_max)}° /{" "}
                        {convertTemp(currentItem.main.temp_min)}°
                      </span>
                    </div>
                    <div>
                      <span className="opacity-75 block">Humidity</span>
                      <span className="font-semibold text-sm text-white">
                        {currentItem.main.humidity}%
                      </span>
                    </div>
                    <div>
                      <span className="opacity-75 block">Wind Speed</span>
                      <span className="font-semibold text-sm text-white">
                        {currentItem.wind.speed} m/s
                      </span>
                    </div>
                    <div>
                      <span className="opacity-75 block">Visibility</span>
                      <span className="font-semibold text-sm text-white">
                        {(currentItem.visibility / 1000).toFixed(1)} km
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sunrise / Sunset & Highlights Card */}
              <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sun className="h-4 w-4 text-amber-500" /> Sun & Moon
                    Schedule
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Solar cycle times for {cityInfo?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-amber-500 text-white shadow-sm">
                        <Sunrise className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Sunrise
                        </p>
                        <p className="text-base font-bold">
                          {formatUnixTime(
                            cityInfo?.sunrise,
                            cityInfo?.timezone,
                          )}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-amber-500" />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-indigo-600 text-white shadow-sm">
                        <Sunset className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Sunset
                        </p>
                        <p className="text-base font-bold">
                          {formatUnixTime(cityInfo?.sunset, cityInfo?.timezone)}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-indigo-500" />
                  </div>

                  <div className="pt-2 text-xs text-muted-foreground space-y-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between">
                      <span>Coordinates:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {cityInfo?.coord?.lat}°, {cityInfo?.coord?.lon}°
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Population:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {cityInfo?.population
                          ? cityInfo.population.toLocaleString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weather Statistics Grid */}
            <section className="space-y-3">
              <h3 className="text-lg font-bold tracking-tight">
                Weather Highlights
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {/* 1. Feels Like */}
                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-medium">Feels Like</span>
                      <Thermometer className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold">
                      {convertTemp(currentItem.main.feels_like)}°{unit}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {currentItem.main.feels_like > currentItem.main.temp
                        ? "Higher than actual due to humidity"
                        : "Similar to actual temperature"}
                    </p>
                  </CardContent>
                </Card>

                {/* 2. Humidity */}
                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-medium">Humidity</span>
                      <Droplets className="h-4 w-4 text-sky-500" />
                    </div>
                    <div className="text-2xl font-bold">
                      {currentItem.main.humidity}%
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full"
                        style={{ width: `${currentItem.main.humidity}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Wind */}
                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-medium">Wind</span>
                      <Wind className="h-4 w-4 text-teal-500" />
                    </div>
                    <div className="text-2xl font-bold">
                      {currentItem.wind.speed}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        m/s
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Compass className="h-3 w-3 text-teal-500" />
                      Dir: {currentItem.wind.deg}° (
                      {getWindCardinal(currentItem.wind.deg)})
                    </p>
                  </CardContent>
                </Card>

                {/* 4. Pressure */}
                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-medium">Pressure</span>
                      <Gauge className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="text-2xl font-bold">
                      {currentItem.main.pressure}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        hPa
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {currentItem.main.pressure >= 1013
                        ? "Normal pressure"
                        : "Low pressure"}
                    </p>
                  </CardContent>
                </Card>

                {/* 5. Visibility */}
                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-medium">Visibility</span>
                      <Eye className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold">
                      {(currentItem.visibility / 1000).toFixed(1)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        km
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {currentItem.visibility >= 10000
                        ? "Clear vision"
                        : "Reduced visibility"}
                    </p>
                  </CardContent>
                </Card>

                {/* 6. Cloudiness */}
                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-medium">Cloud Cover</span>
                      <Cloud className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="text-2xl font-bold">
                      {currentItem.clouds?.all}%
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {currentItem.clouds?.all > 50
                        ? "Mostly cloudy"
                        : "Partly cloudy"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Weather Temperature Interactive Area Chart Section */}
            <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" /> Temperature
                    & Forecast Trends
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Real weather forecast temperatures over time for{" "}
                    {cityInfo?.name}
                  </CardDescription>
                </div>

                {/* Time Selector Dropdown */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    Range:
                  </span>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[140px] h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Next 24 Hours" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">Next 24 Hours</SelectItem>
                      <SelectItem value="3d">Next 3 Days</SelectItem>
                      <SelectItem value="5d">5-Day Forecast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="pt-2">
                <ChartContainer
                  config={chartConfig}
                  className="min-h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="fillTemperature"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0.0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="fillFeelsLike"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#06b6d4"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#06b6d4"
                            stopOpacity={0.0}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="formattedTime"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        minTickGap={25}
                        className="text-xs text-muted-foreground"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        unit={`°${unit}`}
                        className="text-xs text-muted-foreground"
                      />
                      <ChartTooltip
                        cursor={{
                          stroke: "#cbd5e1",
                          strokeWidth: 1,
                          strokeDasharray: "4 4",
                        }}
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value, payload) =>
                              payload?.[0]?.payload?.fullDate || value
                            }
                            indicator="dot"
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />

                      <Area
                        dataKey="feelsLike"
                        name="Feels Like"
                        type="monotone"
                        fill="url(#fillFeelsLike)"
                        stroke="#06b6d4"
                        strokeWidth={2}
                      />
                      <Area
                        dataKey="temperature"
                        name="Temperature"
                        type="monotone"
                        fill="url(#fillTemperature)"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* 5-Day Weather Forecast Grid */}
            <section className="space-y-3">
              <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" /> 5-Day Forecast
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {dailyForecast.map((day, idx) => (
                  <Card
                    key={day.dateStr || idx}
                    className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between"
                  >
                    <CardHeader className="p-4 pb-2 text-center">
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        {idx === 0 ? "Today" : day.dayName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {day.fullDate}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-center space-y-3">
                      {/* Forecast Icon */}
                      <div className="flex justify-center my-1">
                        <img
                          src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
                          alt={day.condition}
                          className="h-14 w-14 drop-shadow-sm hover:scale-110 transition-transform"
                        />
                      </div>

                      <div className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">
                        {day.description || day.condition}
                      </div>

                      {/* Temperature Range */}
                      <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          {day.maxTemp}°
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {day.minTemp}°
                        </span>
                      </div>

                      {/* Rain Probability & Humidity */}
                      <div className="flex items-center justify-around text-[11px] text-muted-foreground pt-1">
                        <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                          <CloudRain className="h-3 w-3" /> {day.pop}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Droplets className="h-3 w-3 text-blue-500" />{" "}
                          {day.humidity}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Weather;
