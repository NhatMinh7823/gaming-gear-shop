const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Cấu hình database
const DB_NAME = 'gaming-gear-shop';
const MONGO_URI = 'mongodb://localhost:27017';
const BACKUP_DIR = './database-backup';

// Danh sách collections cần backup
const COLLECTIONS = [
  'users',
  'products', 
  'categories',
  'orders',
  'reviews',
  'carts'
];

// Tạo thư mục backup nếu chưa tồn tại
function createBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`✅ Đã tạo thư mục backup: ${BACKUP_DIR}`);
  }
}

// Backup từng collection bằng MongoDB driver
async function backupCollection(collection) {
  const client = new MongoClient(MONGO_URI);
  
  try {
    console.log(`🔄 Đang backup collection: ${collection}...`);
    
    await client.connect();
    const db = client.db(DB_NAME);
    const collectionObj = db.collection(collection);
    
    // Lấy tất cả documents
    const documents = await collectionObj.find({}).toArray();
    
    // Ghi vào file JSON
    const outputFile = path.join(BACKUP_DIR, `${collection}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(documents, null, 2));
    
    console.log(`✅ Backup thành công: ${collection} (${documents.length} documents)`);
    return documents.length;
    
  } catch (error) {
    console.error(`❌ Lỗi backup ${collection}:`, error.message);
    throw error;
  } finally {
    await client.close();
  }
}

// Backup toàn bộ database (fallback nếu mongodump không khả dụng)
async function backupFullDatabase() {
  return new Promise((resolve, reject) => {
    const fullBackupDir = path.join(BACKUP_DIR, 'full-backup');
    const command = `mongodump --db ${DB_NAME} --out "${fullBackupDir}"`;
    
    console.log('🔄 Đang thử backup bằng mongodump...');
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.warn('⚠️ mongodump không khả dụng, sử dụng JSON backup thay thế');
        console.log('💡 Các file JSON đã tạo có thể sử dụng để khôi phục database');
        resolve('JSON backup completed');
        return;
      }
      
      if (stderr) {
        console.warn('⚠️ Warning:', stderr);
      }
      
      console.log('✅ Backup toàn bộ database thành công!');
      resolve(stdout);
    });
  });
}

// Tạo file thông tin backup
function createBackupInfo() {
  const backupInfo = {
    database: DB_NAME,
    backup_date: new Date().toISOString(),
    collections: COLLECTIONS,
    backup_type: 'JSON Export + Full Dump',
    instructions: {
      import_json: 'Sử dụng mongoimport để import từng file JSON',
      import_full: 'Sử dụng mongorestore để import toàn bộ từ thư mục full-backup'
    }
  };
  
  const infoFile = path.join(BACKUP_DIR, 'backup-info.json');
  fs.writeFileSync(infoFile, JSON.stringify(backupInfo, null, 2));
  console.log('✅ Đã tạo file thông tin backup: backup-info.json');
}

// Hàm chính
async function main() {
  try {
    console.log('🚀 Bắt đầu backup database...');
    console.log(`📊 Database: ${DB_NAME}`);
    console.log(`📁 Thư mục backup: ${BACKUP_DIR}`);
    console.log('=' .repeat(50));
    
    // Tạo thư mục backup
    createBackupDir();
    
    // Backup từng collection
    console.log('\n📋 Backup từng collection:');
    let totalDocuments = 0;
    for (const collection of COLLECTIONS) {
      try {
        const count = await backupCollection(collection);
        totalDocuments += count;
      } catch (error) {
        console.error(`❌ Không thể backup collection ${collection}:`, error.message);
      }
    }
    
    // Backup toàn bộ database
    console.log('\n💾 Backup toàn bộ database:');
    await backupFullDatabase();
    
    // Tạo file thông tin
    console.log('\n📝 Tạo file thông tin backup:');
    createBackupInfo();
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 BACKUP HOÀN THÀNH!');
    console.log(`📁 Tất cả files backup đã được lưu trong: ${BACKUP_DIR}`);
    console.log(`📊 Tổng số documents đã backup: ${totalDocuments}`);
    console.log('\n📋 Nội dung thư mục backup:');
    console.log('├── users.json');
    console.log('├── products.json');
    console.log('├── categories.json');
    console.log('├── orders.json');
    console.log('├── reviews.json');
    console.log('├── carts.json');
    console.log('├── backup-info.json');
    console.log('└── full-backup/ (nếu mongodump khả dụng)');
    console.log('\n💡 Bạn có thể nén thư mục "database-backup" và upload lên Drive!');
    
  } catch (error) {
    if (error.message.includes('MongoClient')) {
      console.error('❌ Lỗi: Không thể kết nối MongoDB!');
      console.log('💡 Hãy đảm bảo:');
      console.log('   1. MongoDB đang chạy');
      console.log('   2. Đã cài đặt mongodb package: npm install mongodb');
      console.log('   3. Database "gaming_gear_shop" tồn tại');
    } else {
      console.error('❌ Lỗi trong quá trình backup:', error.message);
    }
    process.exit(1);
  }
}

// Chạy script
if (require.main === module) {
  main();
}

module.exports = { main, backupCollection, backupFullDatabase };