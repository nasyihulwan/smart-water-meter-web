import { NextRequest, NextResponse } from 'next/server';
import { runTraining } from '@/lib/training-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uploadId, useInfluxData = true } = body;

    if (!uploadId) {
      return NextResponse.json(
        { error: 'uploadId is required' },
        { status: 400 }
      );
    }

    const result = await runTraining(uploadId, useInfluxData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Training failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Model retrained successfully',
      trainingTime: result.trainingTime,
      metrics: result.metrics,
      forecastSummary: result.forecastSummary,
    });
  } catch (err) {
    console.error('[RETRAIN] Unexpected error:', err);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
