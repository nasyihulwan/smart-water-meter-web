export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { publishRelayControl } from '@/lib/mqttClient';

export async function GET() {
  return NextResponse.json({
    message: 'Relay control endpoint.  Use POST with {"state": "ON" or "OFF"}',
    example: { state: 'ON' },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { state } = body;

    if (state !== 'ON' && state !== 'OFF') {
      return NextResponse.json(
        { success: false, error: 'Invalid state' },
        { status: 400 }
      );
    }

    publishRelayControl(state);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Relay API error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
