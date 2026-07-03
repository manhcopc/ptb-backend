require('dotenv').config();
const { Storage } = require('@google-cloud/storage');
const { Client } = require('pg');

async function clearGCS() {
  console.log('[1/2] Đang xóa dữ liệu trên Google Cloud Storage...');
  try {
    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      keyFilename: process.env.GCS_KEY_FILE_PATH,
    });
    
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    
    // Deleting the 'saas/' prefix
    await bucket.deleteFiles({ prefix: 'saas/' });
    // Also delete any old 'events/' prefix if any
    await bucket.deleteFiles({ prefix: 'events/' });
    
    console.log('✅ Đã xóa toàn bộ dữ liệu trên Google Cloud Storage thành công!');
  } catch (error) {
    console.error('❌ Lỗi khi xóa GCS:', error.message);
  }
}

async function clearDatabase() {
  console.log('\n[2/2] Đang xóa toàn bộ dữ liệu trong Supabase Database...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ Lỗi: Không tìm thấy DATABASE_URL trong file .env');
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    
    // Truncate the events table and cascade down to sessions, media, and final_outputs
    await client.query('TRUNCATE TABLE events CASCADE;');
    
    console.log('✅ Đã xóa trắng Database thành công!');
  } catch (error) {
    console.error('❌ Lỗi khi xóa Database:', error.message);
  } finally {
    await client.end();
  }
}

async function run() {
  await clearGCS();
  await clearDatabase();
  console.log('\n🎉 Hoàn thành Reset System!');
  process.exit(0);
}

run();
