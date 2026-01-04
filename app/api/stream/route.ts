export const runtime = 'nodejs';

import { getLatestMqttData } from '@/lib/mqttClient';

export async function GET() {
  const encoder = new TextEncoder();
  let lastSent = '';
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        if (closed) return;

        try {
          const data = getLatestMqttData();

          if (!data) {
            controller.enqueue(encoder.encode(`: ping\n\n`));
            return;
          }

          const payload = JSON.stringify({
            deviceId: data.device_id,
            flowRate: Number(data.flow_lpm) || 0,
            totalVolume: Number(data.total_m3) * 1000 || 0,
            solenoidState: data.relay_state === 1,
            timestamp: new Date().toISOString(),
          });

          if (payload !== lastSent) {
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            lastSent = payload;
          }
        } catch {
          closed = true;
          clearInterval(interval);
        }
      }, 500);

      return () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
