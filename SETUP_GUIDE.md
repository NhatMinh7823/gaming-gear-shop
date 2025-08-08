# Hướng Dẫn Cài Đặt và Chạy Dự Án Gaming Gear Shop

## 1. Yêu Cầu Hệ Thống

### Phần Mềm Cần Thiết
- **Node.js** (phiên bản 16.x trở lên)
- **MongoDB** (phiên bản 5.x trở lên)
- **MongoDB Compass** (để quản lý database)
- **Git** (để clone dự án)
- **IDE/Editor** (khuyến nghị: Trae IDE, VS Code)
- **Web Browser** (Chrome, Firefox, Edge)

### Hệ Điều Hành
- Windows 10/11
- macOS 10.15+
- Linux Ubuntu 18.04+

## 2. Cài Đặt Môi Trường

### 2.1 Cài Đặt Node.js
1. Truy cập https://nodejs.org/
2. Tải phiên bản LTS mới nhất
3. Cài đặt và kiểm tra:
   ```bash
   node --version
   npm --version
   ```

### 2.2 Cài Đặt MongoDB
1. Truy cập https://www.mongodb.com/try/download/community
2. Tải MongoDB Community Server
3. Cài đặt và khởi động MongoDB service
4. Cài đặt MongoDB Compass từ https://www.mongodb.com/products/compass

### 2.3 Cài Đặt Git
1. Truy cập https://git-scm.com/
2. Tải và cài đặt Git
3. Cấu hình Git:
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

## 3. Clone và Cài Đặt Dự Án

### 3.1 Clone Repository
```bash
# Clone dự án từ repository
git clone <repository-url>
cd gaming-gear-shop
```

### 3.2 Cài Đặt Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd ../frontend
npm install
```

## 4. Cấu Hình Database

### 4.1 Tạo Database MongoDB
1. Mở MongoDB Compass
2. Kết nối đến `mongodb://localhost:27017`
3. Tạo database mới tên `gaming_gear_shop`
4. Tạo các collections:
   - `users`
   - `products`
   - `categories`
   - `orders`
   - `reviews`
   - `carts`

### 4.2 Import Dữ Liệu Mẫu (nếu có)
```bash
# Nếu có file backup database
mongorestore --db gaming_gear_shop --drop /path/to/backup/folder
```

## 5. Cấu Hình Environment Variables

### 5.1 Backend Environment (.env)
Tạo file `.env` trong thư mục `backend/` với nội dung:

```env
# Database
MONGO_URI=mongodb://localhost:27017/gaming_gear_shop

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_UPLOAD=1000000

# VNPay Configuration
VNP_TMN_CODE=your_vnpay_tmn_code
VNP_HASH_SECRET=your_vnpay_hash_secret
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_API=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
VNP_RETURN_URL=http://localhost:3000/payment/vnpay_return

# GHN (Giao Hàng Nhanh) API
GHN_API_URL=https://dev-online-gateway.ghn.vn/shiip/public-api
GHN_TOKEN=your_ghn_token
GHN_SHOP_ID=your_ghn_shop_id

# Email Configuration (nếu có)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FROM_EMAIL=noreply@gaminggearshop.com
FROM_NAME=Gaming Gear Shop

# Chatbot
CHATBOT_DEBUG=true

# CORS
CLIENT_URL=http://localhost:3000
```

### 5.2 Frontend Environment (.env)
Tạo file `.env` trong thư mục `frontend/` với nội dung:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_UPLOAD_URL=http://localhost:5000
```

## 6. Chuẩn Bị API Keys và Services

### 6.1 VNPay (Thanh toán)
1. Đăng ký tài khoản tại https://vnpay.vn/
2. Lấy `TMN_CODE` và `HASH_SECRET`
3. Cập nhật vào file `.env`

### 6.2 GHN - Giao Hàng Nhanh
1. Đăng ký tại https://5sao.ghn.dev/
2. Lấy `TOKEN` và `SHOP_ID`
3. Cập nhật vào file `.env`

### 6.3 Email Service (Gmail)
1. Bật 2-Factor Authentication cho Gmail
2. Tạo App Password
3. Cập nhật thông tin vào file `.env`

## 7. Chuẩn Bị Hình Ảnh và Files Upload

### 7.1 Tạo Thư Mục Uploads
```bash
# Trong thư mục backend
mkdir uploads
mkdir uploads/products
mkdir uploads/users
mkdir uploads/categories
```

### 7.2 Copy Hình Ảnh Có Sẵn
Nếu có hình ảnh từ dự án cũ, copy vào thư mục `backend/uploads/`

## 8. Chạy Dự Án

### 8.1 Khởi Động Backend
```bash
cd backend
npm run dev
# Hoặc
npm start
```

### 8.2 Khởi Động Frontend
```bash
cd frontend
npm start
```

### 8.3 Kiểm Tra
- Backend: http://localhost:5000
- Frontend: http://localhost:3000
- API Documentation: http://localhost:5000/api-docs (nếu có)

## 9. Phương Án Backup Dự Án

### 9.1 Backup Toàn Bộ (Khuyến nghị)

#### Phương án 1: Backup File RAR/ZIP
```bash
# Tạo file nén chứa toàn bộ dự án
# Bao gồm:
# - Source code
# - node_modules (tùy chọn)
# - uploads folder
# - .env files
# - database backup
```

**Nội dung backup:**
- Toàn bộ thư mục dự án
- File `.env` (backend và frontend)
- Thư mục `uploads/` với tất cả hình ảnh
- Database backup (file .json hoặc .bson)
- File `package.json` và `package-lock.json`

#### Phương án 2: Backup Selective
**Tạo các thư mục backup riêng biệt:**

1. **Source Code Backup:**
   ```
   gaming-gear-shop-source/
   ├── backend/ (không bao gồm node_modules)
   ├── frontend/ (không bao gồm node_modules)
   ├── chatbot_system/
   └── README.md
   ```

2. **Environment Config Backup:**
   ```
   gaming-gear-shop-config/
   ├── backend.env
   ├── frontend.env
   └── config-notes.txt
   ```

3. **Assets Backup:**
   ```
   gaming-gear-shop-assets/
   └── uploads/
       ├── products/
       ├── users/
       └── categories/
   ```

4. **Database Backup:**
   ```bash
   # Export database
   mongoexport --db gaming_gear_shop --collection users --out users.json
   mongoexport --db gaming_gear_shop --collection products --out products.json
   mongoexport --db gaming_gear_shop --collection categories --out categories.json
   mongoexport --db gaming_gear_shop --collection orders --out orders.json
   mongoexport --db gaming_gear_shop --collection reviews --out reviews.json
   mongoexport --db gaming_gear_shop --collection carts --out carts.json
   
   # Hoặc backup toàn bộ database
   mongodump --db gaming_gear_shop --out ./database-backup
   ```

### 9.2 Cloud Storage Options

1. **Google Drive:**
   - Upload file RAR/ZIP lên Google Drive
   - Chia sẻ link với quyền truy cập phù hợp

2. **GitHub Private Repository:**
   - Push source code lên GitHub private repo
   - Sử dụng Git LFS cho files lớn

3. **Dropbox/OneDrive:**
   - Sync thư mục dự án với cloud storage

### 9.3 Scripts Backup và Import Database

#### Script Backup Database (`backup-database.js`)

Script này sẽ tự động backup toàn bộ database MongoDB:

**Cách sử dụng:**
```bash
# Chạy script backup
node backup-database.js
```

**Kết quả:**
- Tạo thư mục `database-backup/`
- Export từng collection thành file JSON
- Tạo full backup bằng mongodump
- Tạo file `backup-info.json` chứa thông tin backup

**Cấu trúc thư mục sau backup:**
```
database-backup/
├── users.json
├── products.json
├── categories.json
├── orders.json
├── reviews.json
├── carts.json
├── backup-info.json
└── full-backup/
    └── gaming_gear_shop/
```

#### Script Import Database (`import-database.js`)

Script này để khôi phục database trên máy mới:

**Cách sử dụng:**
```bash
# Import từ JSON files (khuyến nghị)
node import-database.js json

# Import từ full backup
node import-database.js full

# Xem hướng dẫn
node import-database.js help
```

**Lưu ý quan trọng:**
- MongoDB phải đang chạy
- Thư mục `database-backup/` phải tồn tại
- Script sẽ XÓA dữ liệu cũ trước khi import

## 10. Troubleshooting

### 10.1 Lỗi Thường Gặp

1. **Port đã được sử dụng:**
   ```bash
   # Kiểm tra port đang sử dụng
   netstat -ano | findstr :5000
   netstat -ano | findstr :3000
   ```

2. **MongoDB connection error:**
   - Kiểm tra MongoDB service đã chạy
   - Kiểm tra connection string trong `.env`

3. **Module not found:**
   ```bash
   # Xóa node_modules và cài lại
   rm -rf node_modules
   npm install
   ```

4. **CORS errors:**
   - Kiểm tra `CLIENT_URL` trong backend `.env`
   - Kiểm tra `REACT_APP_API_URL` trong frontend `.env`

### 10.2 Logs và Debug
- Backend logs: Console output khi chạy `npm run dev`
- Frontend logs: Browser Developer Tools
- MongoDB logs: MongoDB Compass hoặc MongoDB logs

## 11. Production Deployment

### 11.1 Environment Variables cho Production
```env
NODE_ENV=production
MONGO_URI=mongodb://your-production-db-url
CLIENT_URL=https://your-domain.com
```

### 11.2 Build Frontend
```bash
cd frontend
npm run build
```

### 11.3 Process Manager (PM2)
```bash
npm install -g pm2
pm2 start backend/server.js --name "gaming-gear-shop-backend"
```

## 12. Quy Trình Backup và Import Database Chi Tiết

### 12.1 Backup Database Trên Máy Hiện Tại

#### Bước 1: Chạy Script Backup
```bash
# Di chuyển đến thư mục dự án
cd gaming-gear-shop

# Chạy script backup
node backup-database.js
```

#### Bước 2: Kiểm Tra Kết Quả
Sau khi chạy script, bạn sẽ thấy:
```
database-backup/
├── users.json          # Dữ liệu người dùng
├── products.json       # Dữ liệu sản phẩm
├── categories.json     # Dữ liệu danh mục
├── orders.json         # Dữ liệu đơn hàng
├── reviews.json        # Dữ liệu đánh giá
├── carts.json          # Dữ liệu giỏ hàng
├── backup-info.json    # Thông tin backup
└── full-backup/        # Full backup bằng mongodump
    └── gaming_gear_shop/
```

#### Bước 3: Nén và Upload lên Drive
```bash
# Nén thư mục backup
# Windows: Chuột phải -> Send to -> Compressed folder
# Hoặc dùng 7-Zip, WinRAR

# Tạo file: database-backup-YYYY-MM-DD.zip
# Upload lên Google Drive
```

### 12.2 Import Database Trên Máy Mới

#### Bước 1: Chuẩn Bị
```bash
# Đảm bảo MongoDB đang chạy
# Windows: Kiểm tra Services -> MongoDB Server
# Hoặc chạy: net start MongoDB

# Kiểm tra kết nối MongoDB
mongo --eval "db.runCommand({ping: 1})"
```

#### Bước 2: Giải Nén File Backup
```bash
# Giải nén file database-backup-YYYY-MM-DD.zip
# Đảm bảo thư mục "database-backup" nằm trong thư mục dự án
```

#### Bước 3: Chạy Script Import
```bash
# Di chuyển đến thư mục dự án
cd gaming-gear-shop

# Import từ JSON files (khuyến nghị)
node import-database.js json

# Hoặc import từ full backup
node import-database.js full
```

#### Bước 4: Kiểm Tra Kết Quả
```bash
# Kết nối MongoDB Compass
# URL: mongodb://localhost:27017
# Database: gaming_gear_shop

# Kiểm tra các collections đã được import
# Kiểm tra số lượng documents trong mỗi collection
```

### 12.3 Xử Lý Lỗi Thường Gặp

#### Lỗi: "MongoDB chưa chạy"
```bash
# Windows
net start MongoDB

# Hoặc khởi động từ Services
# services.msc -> MongoDB Server -> Start
```

#### Lỗi: "Không tìm thấy thư mục backup"
```bash
# Đảm bảo cấu trúc thư mục đúng:
gaming-gear-shop/
├── database-backup/     # Thư mục này phải tồn tại
│   ├── users.json
│   ├── products.json
│   └── ...
├── import-database.js
└── backup-database.js
```

#### Lỗi: "Command not found: mongoexport/mongoimport"
```bash
# Cài đặt MongoDB Database Tools
# Download từ: https://www.mongodb.com/try/download/database-tools
# Hoặc thêm MongoDB bin vào PATH
```

### 12.4 Backup Định Kỳ (Tùy Chọn)

#### Tạo Batch Script Tự Động (Windows)
Tạo file `auto-backup.bat`:
```batch
@echo off
cd /d "D:\Desktop\Learn Area\gaming-gear-shop"
node backup-database.js
echo Backup completed at %date% %time%
pause
```

#### Lên Lịch Backup
1. Mở Task Scheduler (Windows)
2. Create Basic Task
3. Chọn tần suất (hàng ngày/tuần)
4. Action: Start a program
5. Program: `auto-backup.bat`

---

**Lưu ý:** 
- Thay thế tất cả `your_*` values bằng thông tin thực tế
- Backup thường xuyên, đặc biệt trước khi deploy
- Test trên môi trường staging trước khi production
- Giữ bí mật các API keys và không commit vào Git
- Luôn kiểm tra kết quả backup và import
- Lưu trữ backup ở nhiều nơi khác nhau (Drive, Dropbox, USB...)