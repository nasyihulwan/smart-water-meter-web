import { NextResponse } from 'next/server';
import { queryWaterReadings, getLatestReading } from '@/lib/influxdb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('device_id') || 'ESP32_001';
    const range = searchParams.get('range') || '-24h';

    // Get historical data
    const historicalData = await queryWaterReadings(deviceId, range);

    // Get latest reading
    const latestReading = await getLatestReading(deviceId);

    // Calculate stats
    const totalVolume = historicalData.reduce(
      (sum, reading) => sum + reading.totalVolume,
      0
    );
    const avgFlowRate =
      historicalData.reduce((sum, reading) => sum + reading.flowRate, 0) /
      (historicalData.length || 1);

    return NextResponse.json({
      success: true,
      latest: latestReading,
      historical: historicalData,
      stats: {
        totalVolume: totalVolume.toFixed(2),
        avgFlowRate: avgFlowRate.toFixed(2),
        dataPoints: historicalData.length,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
