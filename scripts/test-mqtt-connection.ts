import mqtt from 'mqtt';

console.log('🔍 Testing MQTT Connection to ESP32...\n');

const MQTT_URL = 'mqtts://k69c9c0c.ala.asia-southeast1.emqxsl.com:8883';

const client = mqtt.connect(MQTT_URL, {
  username: 'water_meter_device',
  password: 'sister123',
  rejectUnauthorized: false,
});

let messageCount = 0;

client.on('connect', () => {
  console.log('✅ MQTT Connected to broker: EMQX');
  console.log('📡 Subscribing to topic: water_meter/data');
  console.log('⏳ Waiting for ESP32 messages...\n');
  console.log('─'.repeat(50));

  // Subscribe ke topic water_meter/data
  client.subscribe('water_meter/data', { qos: 1 }, (err) => {
    if (err) {
      console.error('❌ Subscribe error:', err);
    } else {
      console.log('✅ Subscribed to water_meter/data!\n');
      console.log('🔍 Waiting for ESP32 to send data...\n');
    }
  });
});

client.on('message', (topic, message) => {
  messageCount++;
  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
  });

  console.log(`\n📩 [${timestamp}] Message #${messageCount}`);
  console.log(`   Topic: ${topic}`);

  try {
    const data = JSON.parse(message.toString());
    console.log('   Data:', JSON.stringify(data, null, 2));

    // Validate expected fields from ESP32
    if (data.device_id) {
      console.log('   ✅ device_id:', data.device_id);
    } else {
      console.log('   ⚠️  device_id MISSING!');
    }

    if (data.flow_lpm !== undefined) {
      console.log('   ✅ flow_lpm:', data.flow_lpm);
    }

    if (data.total_m3 !== undefined) {
      console.log('   ✅ total_m3:', data.total_m3);
    }

    if (data.relay_state !== undefined) {
      console.log('   ✅ relay_state:', data.relay_state);
    }
  } catch (err) {
    console.log('   ⚠️  Raw (not JSON):', message.toString());
  }

  console.log('─'.repeat(50));
});

client.on('error', (err) => {
  console.error('❌ MQTT Error:', err.message);
});

client.on('close', () => {
  console.log('🔌 MQTT Connection closed');
});

client.on('reconnect', () => {
  console.log('🔄 Reconnecting to MQTT...');
});

// Keep alive for 2 minutes then exit
setTimeout(() => {
  console.log('\n⏰ Test completed after 2 minutes');
  console.log(`📊 Total messages received: ${messageCount}`);

  if (messageCount === 0) {
    console.log('\n❌ PROBLEM: ESP32 tidak mengirim data ke MQTT!');
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Pastikan ESP32 menyala dan connected ke WiFi');
    console.log('   2. Cek apakah ESP32 terhubung ke broker MQTT yang sama');
    console.log(
      '   3. Cek topic yang digunakan ESP32 (harus: water_meter/data)'
    );
    console.log('   4. Cek credentials MQTT di ESP32 code');
    console.log('   5. Cek Serial Monitor ESP32 untuk error messages');
  } else {
    console.log('\n✅ ESP32 is sending data correctly!');
  }

  client.end();
  process.exit(0);
}, 120000); // 2 minutes

console.log('📌 Press Ctrl+C to stop earlier\n');
