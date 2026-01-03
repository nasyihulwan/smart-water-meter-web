import dotenv from 'dotenv';
import { writeWaterReading } from '../lib/influxdb';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function generateDummyData() {
  console.log('🚀 Generating dummy data for last 24 hours...');
  console.log('📍 InfluxDB URL:', process.env.INFLUXDB_URL);

  const now = new Date();
  const deviceId = 'ESP32_001';

  // Generate data untuk 24 jam terakhir (setiap 10 menit)
  for (let i = 144; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 10 * 60 * 1000);

    // Simulate realistic water usage patterns
    const hour = timestamp.getHours();
    let flowRate = 0;

    // Peak hours:  6-8 AM, 12-1 PM, 6-9 PM
    if (
      (hour >= 6 && hour <= 8) ||
      (hour >= 12 && hour <= 13) ||
      (hour >= 18 && hour <= 21)
    ) {
      flowRate = Math.random() * 8 + 2; // 2-10 L/min
    } else if (hour >= 22 || hour <= 5) {
      flowRate = Math.random() * 1; // 0-1 L/min (malam)
    } else {
      flowRate = Math.random() * 4 + 1; // 1-5 L/min
    }

    const totalVolume = flowRate * 10; // Volume dalam 10 menit
    const solenoidState = flowRate > 0.5;

    try {
      await writeWaterReading({
        deviceId,
        flowRate: parseFloat(flowRate.toFixed(2)),
        totalVolume: parseFloat(totalVolume.toFixed(2)),
        solenoidState,
      });

      console.log(
        `✅ [${timestamp.toISOString()}] Flow: ${flowRate.toFixed(
          2
        )} L/min, Volume: ${totalVolume.toFixed(2)} L`
      );

      // Delay untuk tidak overwhelm InfluxDB
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error('❌ Error writing data:', error);
    }
  }

  console.log('✅ Dummy data generation completed!');
  process.exit(0);
}

generateDummyData();
