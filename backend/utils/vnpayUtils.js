const crypto = require("crypto");

/**
 * Sort object by key
 * @param {Object} obj - Object cần sắp xếp
 * @returns {Object} Object đã sắp xếp
 */
const sortObject = (obj) => {
  const sorted = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    if (obj[key] !== "" && obj[key] !== null && obj[key] !== undefined) {
      sorted[key] = obj[key];
    }
  }

  return sorted;
};

/**
 * Tạo HMAC hash với SHA512
 * @param {string} data - Dữ liệu cần hash
 * @param {string} secret - Secret key
 * @returns {string} Chuỗi hash đã được tạo
 */
const createHmacHash = (data, secret) => {
  const hmac = crypto.createHmac("sha512", secret);
  return hmac.update(Buffer.from(data, "utf-8")).digest("hex");
};

/**
 * Format date theo định dạng yyyyMMddHHmmss
 * @param {Date} date - Đối tượng Date
 * @returns {string} Chuỗi date đã format
 */
const formatDate = (date) => {
  const yyyy = date.getFullYear().toString();
  const MM = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  const HH = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  const ss = date.getSeconds().toString().padStart(2, "0");

  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
};

/**
 * Tạo mã đơn hàng tham chiếu có format PyyyyMMddHHmmss + orderId
 * @param {string} orderId - ID của đơn hàng
 * @returns {string} Mã tham chiếu
 */
const createTxnRef = (orderId) => {
  const date = new Date();
  const timestamp = formatDate(date);
  return `P${timestamp}${orderId}`;
};

/**
 * Trích xuất orderId từ vnp_TxnRef
 * @param {string} txnRef - Mã tham chiếu từ VNPay
 * @returns {string} ID của đơn hàng
 */
const extractOrderId = (txnRef) => {
  try {
    console.log("Extracting order ID from:", txnRef);

    // Nếu txnRef có format PyyyyMMddHHmmss + orderId
    if (txnRef && txnRef.startsWith("P") && txnRef.length > 15) {
      const orderId = txnRef.substring(15);
      console.log("Extracted order ID:", orderId);
      return orderId;
    }

    console.log("Using original txnRef as order ID");
    return txnRef;
  } catch (error) {
    console.error("Error in extractOrderId:", error);
    return null;
  }
};

module.exports = {
  sortObject,
  createHmacHash,
  formatDate,
  createTxnRef,
  extractOrderId,
};
