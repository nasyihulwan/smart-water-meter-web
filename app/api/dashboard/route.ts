export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  queryWaterReadings,
  getLatestReading,
  type WaterReading,
} from '@/lib/influxdb';
import { getLatestMqttData } from '@/lib/mqttClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('device_id') ?? 'water_meter_01';
    const range = searchParams.get('range') ?? '-24h';

    const historicalData: WaterReading[] = await queryWaterReadings(
      deviceId,
      range
    );

    const latestInflux = await getLatestReading(deviceId);
    const latestMqtt = getLatestMqttData();

    const latest: WaterReading | null = latestInflux
      ? latestInflux
      : latestMqtt
      ? {
          deviceId: latestMqtt.device_id,
          flowRate: Number(latestMqtt.flow_lpm) || 0,
          totalVolume: Number(latestMqtt.total_m3) * 1000 || 0,
          solenoidState: latestMqtt.relay_state === 1,
          timestamp: new Date(),
        }
      : null;

    const totalVolume = historicalData.reduce(
      (sum, r) => sum + r.totalVolume,
      0
    );

    const avgFlowRate =
      historicalData.reduce((sum, r) => sum + r.flowRate, 0) /
      (historicalData.length || 1);

    return NextResponse.json({
      success: true,
      latest,
      historical: historicalData,
      stats: {
        totalVolume: totalVolume.toFixed(3),
        avgFlowRate: avgFlowRate.toFixed(2),
        dataPoints: historicalData.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
