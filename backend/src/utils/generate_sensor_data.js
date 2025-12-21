const generateSensorDataSQL = (numRecords) => {
    const sensorRanges = {
        1: { min: 10.0, max: 40.0 }, // 온도 (°C)
        2: { min: 20.0, max: 90.0 }, // 습도 (%)
        3: { min: 0.0, max: 2000.0 }, // 조도 (lux)
        4: { min: 400.0, max: 1200.0 }, // CO2 (ppm)
        5: { min: 0.0, max: 50.0 }, // PM2.5 (μg/m³)
        6: { min: 0.0, max: 100.0 }, // 토양수분 (%)
    };

    const startDate = new Date("2025-04-07T00:00:00");
    const endDate = new Date("2025-04-08T23:59:59");

    const randomBetween = (min, max) =>
        (Math.random() * (max - min) + min).toFixed(2);
    const randomDate = (start, end) => {
        const date = new Date(
            start.getTime() + Math.random() * (end.getTime() - start.getTime())
        );
        return date.toISOString().slice(0, 19).replace("T", " "); // DATETIME 형식으로 변환
    };

    const data = [];
    for (let i = 0; i < numRecords; i++) {
        const deviceId = Math.floor(Math.random() * 6) + 1; // 센서 ID (1~6)
        const value = randomBetween(
            sensorRanges[deviceId].min,
            sensorRanges[deviceId].max
        );
        const recordedAt = randomDate(startDate, endDate);

        data.push(`(${deviceId}, ${value}, '${recordedAt}')`);
    }

    return `INSERT INTO sensor_data (device_id, value, recorded_at) VALUES\n${data.join(
        ",\n"
    )};`;
};

// 생성된 SQL 출력
console.log(generateSensorDataSQL(1000));
// node .\generate_sensor_data.js > sensor_data.sql --> 출력 명령어
