import temperatureIcon from '@/assets/icons/home/temperature.svg'
import humidityIcon from '@/assets/icons/home/humidity.svg'
import airIcon from '@/assets/icons/home/air.svg'
import soilIcon from '@/assets/icons/home/soil.svg'
import lightIcon from '@/assets/icons/home/light.svg'
import windIcon from '@/assets/icons/home/wind.svg'
import rainIcon from '@/assets/icons/home/rain.svg'
import maskIcon from '@/assets/icons/home/mask.svg'
import cloudIcon from '@/assets/icons/home/cloud.svg'
import pressureIcon from '@/assets/icons/home/pressure.svg'

// 백엔드 센서 타입과 매칭을 위한 매핑
export const SENSOR_TYPE_MAPPING = {
  temperature: 'TEMPERATURE',
  humidity: 'HUMIDITY',
  co2: 'CO2',
  soil_moisture: 'SOIL_MOISTURE',
  light: 'LIGHT',
  wind: 'WIND',
  rain: 'RAIN',
  pm25: 'PM25',
  cloud: 'CLOUD',
  pressure: 'PRESSURE',
}

export const SENSOR_TYPES = {
  TEMPERATURE: {
    icon: temperatureIcon,
    unit: '°C',
    name: '온도',
  },
  HUMIDITY: {
    icon: humidityIcon,
    unit: '%',
    name: '습도',
  },
  CO2: {
    icon: airIcon,
    unit: 'ppm',
    name: '이산화탄소',
  },
  SOIL_MOISTURE: {
    icon: soilIcon,
    unit: '%',
    name: '토양 수분',
  },
  LIGHT: {
    icon: lightIcon,
    unit: 'lux',
    name: '조도',
  },
  WIND: {
    icon: windIcon,
    unit: 'm/s',
    name: '풍속',
  },
  RAIN: {
    icon: rainIcon,
    unit: 'mm',
    name: '강우량',
  },
  PM25: {
    icon: maskIcon,
    unit: '㎍/㎥',
    name: '미세먼지(PM2.5)',
  },
  CLOUD: {
    icon: cloudIcon,
    unit: '%',
    name: '운량',
  },
  PRESSURE: {
    icon: pressureIcon,
    unit: 'hPa',
    name: '기압',
  },
}
