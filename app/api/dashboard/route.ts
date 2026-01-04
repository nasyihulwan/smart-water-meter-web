export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  queryWaterReadings,
  queryAggregatedReadings,
  getLatestReading,
  type WaterReading,
  type AggregatedReading,
} from '@/lib/influxdb';
import { getLatestMqttData } from '@/lib/mqttClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('device_id') ?? 'water_meter_01';
    const range = searchParams.get('range') ?? '-24h';
    const mode = searchParams.get('mode') ?? 'live';

    let historicalData: (WaterReading | AggregatedReading)[] = [];

    if (mode === 'aggregated') {
      const window = searchParams.get('window') ?? '1h';
      historicalData = await queryAggregatedReadings(deviceId, range, window);
    } else {
      historicalData = await queryWaterReadings(deviceId, range);
    }

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

    // ✅ FIX: Total volume harus dari latest reading (total kumulatif)
    const totalVolume = latest?.totalVolume || 0;

    // ✅ Avg flow rate dari historical data
    const avgFlowRate =
      historicalData.length > 0
        ? historicalData.reduce(
            (sum, r) =>
              sum + ('flowRate' in r ? r.flowRate : r.avgFlowRate || 0),
            0
          ) / historicalData.length
        : 0;

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
