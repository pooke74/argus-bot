
export interface WeatherData {
    temperature: number;
    weathercode: number; // WMO code
    windspeed: number;
    is_day: number;
    time: string;
}

export const WeatherService = {
    async getWeather(lat: number, lon: number): Promise<WeatherData | null> {
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`
            );
            const data = await response.json();
            return data.current_weather;
        } catch (error) {
            console.error('Weather fetch error:', error);
            return null;
        }
    },

    getWeatherIcon(code: number, isDay: number): string {
        // WMO Weather interpretation codes (WW)
        if (code === 0) return isDay ? '☀️' : '🌙';
        if (code === 1 || code === 2 || code === 3) return isDay ? '⛅' : '☁️';
        if (code === 45 || code === 48) return '🌫️';
        if (code >= 51 && code <= 67) return '🌧️';
        if (code >= 71 && code <= 77) return '❄️';
        if (code >= 80 && code <= 82) return 'Showers';
        if (code >= 95) return '⛈️';
        return 'UNKNOWN';
    },

    getWeatherDescription(code: number): string {
        const codes: { [key: number]: string } = {
            0: 'Açık',
            1: 'Açık', 2: 'Parçalı Bulutlu', 3: 'Bulutlu',
            45: 'Sisli', 48: 'Kırağı',
            51: 'Hafif Çiseleme', 53: 'Çiseleme', 55: 'Yoğun Çiseleme',
            61: 'Hafif Yağmur', 63: 'Yağmur', 65: 'Şiddetli Yağmur',
            71: 'Hafif Kar', 73: 'Kar', 75: 'Yoğun Kar',
            80: 'Sağanak', 81: 'Sağanak', 82: 'Şiddetli Sağanak',
            95: 'Fırtına', 96: 'Dolu Fırtınası', 99: 'Şiddetli Dolu'
        };
        return codes[code] || 'Bilinmiyor';
    }
};
