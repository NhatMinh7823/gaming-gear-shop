// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const path = require("path");
const fs = require("fs");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Apply middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Serve static files from the 'uploads' directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Ensure uploads directories exist
const uploadDirs = [
  path.join(__dirname, "uploads", "images", "categories"),
  path.join(__dirname, "uploads", "images", "products"),
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Import routes
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const orderRoutes = require("./routes/orderRoutes");
const cartRoutes = require("./routes/cartRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const vnpayRoutes = require("./routes/vnpayRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// Use routes
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/payment", vnpayRoutes);
app.use("/api/chatbot", chatbotRoutes);

// Ghi log chi tiết cho trường hợp VNPay
// app.use("/api/vnpay", (req, res, next) => {
//   console.log("------- VNPay Request Log -------");
//   console.log("Time:", new Date().toISOString());
//   console.log("Method:", req.method);
//   console.log("URL:", req.url);
//   console.log("Query:", JSON.stringify(req.query));
//   console.log("Body:", JSON.stringify(req.body));
//   console.log("---------------------------------");
//   next();
// });

app.use("/api/vnpay", vnpayRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Gaming Gear Shop API is running");
});

// Error middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
