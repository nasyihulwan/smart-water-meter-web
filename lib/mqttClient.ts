import mqtt from 'mqtt';
import type { WaterMeterData } from '@/types/waterMeter';

const MQTT_URL = 'mqtts://k69c9c0c.ala.asia-southeast1.emqxsl.com:8883';

const options = {
  username: 'water_meter_device',
  password: 'sister123',
  rejectUnauthorized: false,
};

let latestData: WaterMeterData | null = null;

const client = mqtt.connect(MQTT_URL, options);

client.on('connect', () => {
  console.log('✅ MQTT connected');
  client.subscribe('water_meter/data');
});

client.on('message', (_topic: string, message: Buffer) => {
  try {
    const parsed: WaterMeterData = JSON.parse(message.toString());
    latestData = parsed;
  } catch (err) {
    console.error('❌ MQTT JSON parse error', err);
  }
});

export function getLatestMqttData(): WaterMeterData | null {
  return latestData;
}
