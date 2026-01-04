import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env.local'),
});

// 🔍 DEBUG SEKALI SAJA (BOLEH DIHAPUS NANTI)
console.log('[ENV CHECK] INFLUXDB_URL =', process.env.INFLUXDB_URL);

import mqtt from 'mqtt';
import { writeWaterReading } from '../lib/influxdb';

// CONNECT KE EMQX
const client = mqtt.connect(
  'mqtts://k69c9c0c.ala.asia-southeast1.emqxsl.com:8883',
  {
    username: 'water_meter_device',
    password: 'sister123',
    rejectUnauthorized: false,
  }
);

client.on('connect', () => {
  console.log('✅ MQTT → Influx Worker Connected');
  client.subscribe('water_meter/data');
});

client.on('message', async (_, message) => {
  try {
    const raw = message.toString();
    console.log('📩 MQTT RAW:', raw);

    const data = JSON.parse(raw);

    if (!data.device_id) {
      console.error('❌ device_id missing');
      return;
    }

    await writeWaterReading({
      deviceId: data.device_id, // ⬅️ water_meter_01
      flowRate: Number(data.flow_lpm) || 0,
      totalVolume: Number(data.total_m3) * 1000 || 0,
      solenoidState: data.relay_state === 1,
    });

    console.log(`💾 Saved to Influx | ${data.device_id}`);
  } catch (err) {
    console.error('❌ Worker error:', err);
  }
});
