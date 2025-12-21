import axios from "axios";
import { saveWeatherData } from "./dbService.js";
import { WEATHER_API_KEY, WEATHER_API_URL } from "../config/apiConfig.js";

export async function fetchWeatherData(lat, lon) {
    try {
        const response = await axios.get(WEATHER_API_URL, {
            params: {
                lat,
                lon,
                appid: WEATHER_API_KEY,
                units: "metric",
            },
        });

        const data = response.data;

        // 필요한 6가지 센서 데이터만 추출하여 반환
        return {
            temperature: data.main.temp, // 온도 (°C)
            humidity: data.main.humidity, // 습도 (%)
            rainfall: data.rain ? data.rain["1h"] : 0, // 강수량 (mm), 비가 없으면 0
            cloudCoverage: data.clouds.all, // 구름량 (%)
            windSpeed: data.wind.speed, // 풍속 (m/s)
            pressure: data.main.pressure, // 기압 (hPa)
        };
    } catch (error) {
        console.error("날씨 데이터를 가져오는 중 오류 발생:", error.message);
        throw new Error("날씨 데이터를 가져올 수 없습니다.");
    }
}

export async function fetchAndSaveWeatherData() {
    const locations = [
        // { name: 'Seoul', lat: 37.5665, lon: 126.9780 },
        { name: "Busan", lat: 35.1796, lon: 129.0756 },
    ];

    for (const location of locations) {
        try {
            const weatherData = await fetchWeatherData(
                location.lat,
                location.lon
            );
            await saveWeatherData(weatherData);
            console.log(`날씨 데이터 저장 완료: ${location.name}`);
        } catch (error) {
            console.error(
                `날씨 데이터 저장 실패 (${location.name}):`,
                error.message
            );
        }
    }
}
