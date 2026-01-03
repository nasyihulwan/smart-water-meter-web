import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env. local' });

const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
const token =
  process.env.INFLUXDB_TOKEN ||
  'udyVmKBVBHxaKQQRIoP1H62F3xesLw8bAUyRN-YlTLkRhiYmt_rn4WSNmii_5VYNVun_bxj85pPSA3lidcbAdg==';
const org = process.env.INFLUXDB_ORG || 'my-org';
const bucket = process.env.INFLUXDB_BUCKET || 'water-meter';

async function clearData() {
  console.log('🗑️  Clearing all data from InfluxDB...');
  console.log('📍 Bucket:', bucket);
  console.log('📍 Organization:', org);

  try {
    const deleteUrl = `${url}/api/v2/delete? org=${org}&bucket=${bucket}`;

    const response = await fetch(deleteUrl, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start: '1970-01-01T00:00:00Z',
        stop: '2030-12-31T23:59:59Z',
        predicate: '_measurement="water_reading"',
      }),
    });

    if (response.ok) {
      console.log('✅ All data cleared successfully!');
    } else {
      const errorText = await response.text();
      console.error('❌ Error clearing data:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }

  process.exit(0);
}

clearData();
