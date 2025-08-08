const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Cấu hình database
const DB_NAME = 'gaming-gear-shop';
const MONGO_URI = 'mongodb://localhost:27017';
const BACKUP_DIR = './database-backup';

// Danh sách collections
const COLLECTIONS = [
  'users',
  'products', 
  'categories',
  'orders',
  'reviews',
  'carts'
];

// Kiểm tra thư mục backup có tồn tại không
function checkBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error(`❌ Không tìm thấy thư mục backup: ${BACKUP_DIR}`);
    console.log('💡 Hãy đảm bảo bạn đã giải nén file backup vào thư mục này!');
    process.exit(1);
  }
  console.log(`✅ Tìm thấy thư mục backup: ${BACKUP_DIR}`);
}

// Kiểm tra MongoDB đã chạy chưa
function checkMongoDB() {
  return new Promise((resolve, reject) => {
    exec('mongo --eval "db.runCommand({ping: 1})"', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ MongoDB chưa chạy hoặc chưa cài đặt!');
        console.log('💡 Hãy khởi động MongoDB service trước khi chạy script này.');
        reject(error);
        return;
      }
      console.log('✅ MongoDB đang chạy');
      resolve();
    });
  });
}

// Import từng collection từ file JSON bằng MongoDB driver
async function importCollection(collection) {
  const client = new MongoClient(MONGO_URI);
  
  try {
    const inputFile = path.join(BACKUP_DIR, `${collection}.json`);
    
    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(inputFile)) {
      console.warn(`⚠️ Không tìm thấy file: ${collection}.json`);
      return 0;
    }
    
    console.log(`🔄 Đang import collection: ${collection}...`);
    
    // Đọc dữ liệu từ file JSON
    const jsonData = fs.readFileSync(inputFile, 'utf8');
    const documents = JSON.parse(jsonData);
    
    if (!Array.isArray(documents) || documents.length === 0) {
      console.warn(`⚠️ File ${collection}.json trống hoặc không hợp lệ`);
      return 0;
    }
    
    // Kết nối MongoDB và import
    await client.connect();
    const db = client.db(DB_NAME);
    const collectionObj = db.collection(collection);
    
    // Xóa collection cũ và insert dữ liệu mới
    await collectionObj.deleteMany({});
    const result = await collectionObj.insertMany(documents);
    
    console.log(`✅ Import thành công: ${collection} (${result.insertedCount} documents)`);
    return result.insertedCount;
    
  } catch (error) {
    console.error(`❌ Lỗi import ${collection}:`, error.message);
    throw error;
  } finally {
    await client.close();
  }
}

// Import toàn bộ database từ mongodump
function importFullDatabase() {
  return new Promise((resolve, reject) => {
    const fullBackupDir = path.join(BACKUP_DIR, 'full-backup');
    
    // Kiểm tra thư mục full-backup có tồn tại không
    if (!fs.existsSync(fullBackupDir)) {
      console.warn('⚠️ Không tìm thấy thư mục full-backup, bỏ qua import full database');
      resolve();
      return;
    }
    
    const command = `mongorestore --db ${DB_NAME} --drop "${path.join(fullBackupDir, DB_NAME)}"`;
    
    console.log('🔄 Đang import toàn bộ database từ full backup...');
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Lỗi import toàn bộ database:', error.message);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.warn('⚠️ Warning:', stderr);
      }
      
      console.log('✅ Import toàn bộ database thành công!');
      resolve(stdout);
    });
  });
}

// Hiển thị thông tin backup
function showBackupInfo() {
  const infoFile = path.join(BACKUP_DIR, 'backup-info.json');
  
  if (fs.existsSync(infoFile)) {
    try {
      const backupInfo = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
      console.log('\n📋 Thông tin backup:');
      console.log(`   Database: ${backupInfo.database}`);
      console.log(`   Ngày backup: ${new Date(backupInfo.backup_date).toLocaleString('vi-VN')}`);
      console.log(`   Collections: ${backupInfo.collections.join(', ')}`);
    } catch (error) {
      console.warn('⚠️ Không thể đọc file backup-info.json');
    }
  }
}

// Kiểm tra kết quả import
function verifyImport() {
  return new Promise((resolve, reject) => {
    const command = `mongo ${DB_NAME} --eval "db.stats()" --quiet`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.warn('⚠️ Không thể kiểm tra kết quả import');
        resolve();
        return;
      }
      
      try {
        const stats = JSON.parse(stdout);
        console.log('\n📊 Thống kê database sau import:');
        console.log(`   Database: ${stats.db}`);
        console.log(`   Collections: ${stats.collections}`);
        console.log(`   Objects: ${stats.objects}`);
        console.log(`   Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
      } catch (parseError) {
        console.warn('⚠️ Không thể parse thống kê database');
      }
      
      resolve();
    });
  });
}

// Hàm chính - Import từ JSON files
async function importFromJSON() {
  try {
    console.log('🚀 Bắt đầu import database từ JSON files...');
    console.log(`📊 Database: ${DB_NAME}`);
    console.log(`📁 Thư mục backup: ${BACKUP_DIR}`);
    console.log('=' .repeat(50));
    
    // Kiểm tra các điều kiện
    checkBackupDir();
    showBackupInfo();
    
    // Import từng collection
    console.log('\n📋 Import từng collection:');
    let totalImported = 0;
    for (const collection of COLLECTIONS) {
      try {
        const count = await importCollection(collection);
        totalImported += count;
      } catch (error) {
        console.error(`❌ Không thể import collection ${collection}:`, error.message);
      }
    }
    
    // Kiểm tra kết quả
    await verifyImport();
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 IMPORT JSON HOÀN THÀNH!');
    console.log(`📊 Tổng số documents đã import: ${totalImported}`);
    console.log('💡 Database đã được khôi phục từ các file JSON.');
    
  } catch (error) {
    if (error.message.includes('MongoClient')) {
      console.error('❌ Lỗi: Không thể kết nối MongoDB!');
      console.log('💡 Hãy đảm bảo:');
      console.log('   1. MongoDB đang chạy');
      console.log('   2. Đã cài đặt mongodb package: npm install mongodb');
      console.log('   3. Database có quyền ghi');
    } else {
      console.error('❌ Lỗi trong quá trình import:', error.message);
    }
    process.exit(1);
  }
}

// Hàm chính - Import từ full backup
async function importFromFullBackup() {
  try {
    console.log('🚀 Bắt đầu import database từ full backup...');
    console.log(`📊 Database: ${DB_NAME}`);
    console.log(`📁 Thư mục backup: ${BACKUP_DIR}`);
    console.log('=' .repeat(50));
    
    // Kiểm tra các điều kiện
    checkBackupDir();
    await checkMongoDB();
    showBackupInfo();
    
    // Import toàn bộ database
    console.log('\n💾 Import toàn bộ database:');
    await importFullDatabase();
    
    // Kiểm tra kết quả
    await verifyImport();
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 IMPORT FULL BACKUP HOÀN THÀNH!');
    console.log('💡 Database đã được khôi phục từ full backup.');
    
  } catch (error) {
    console.error('❌ Lỗi trong quá trình import:', error);
    process.exit(1);
  }
}

// Hiển thị hướng dẫn sử dụng
function showUsage() {
  console.log('\n📖 HƯỚNG DẪN SỬ DỤNG:');
  console.log('\n1. Import từ JSON files (khuyến nghị):');
  console.log('   node import-database.js json');
  console.log('\n2. Import từ full backup:');
  console.log('   node import-database.js full');
  console.log('\n3. Hiển thị hướng dẫn:');
  console.log('   node import-database.js help');
  console.log('\n💡 Lưu ý:');
  console.log('   - Đảm bảo MongoDB đang chạy');
  console.log('   - Thư mục "database-backup" phải tồn tại');
  console.log('   - Script sẽ XÓA dữ liệu cũ trước khi import');
}

// Xử lý command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (require.main === module) {
  switch (command) {
    case 'json':
      importFromJSON();
      break;
    case 'full':
      importFromFullBackup();
      break;
    case 'help':
    case '--help':
    case '-h':
      showUsage();
      break;
    default:
      console.log('❌ Lệnh không hợp lệ!');
      showUsage();
      process.exit(1);
  }
}

module.exports = { importFromJSON, importFromFullBackup, importCollection };