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

// Initialize GHN warehouse configuration
const ghnService = require("./services/ghnService");
const chatbotService = require("./services/chatbotService");

ghnService.initializeWarehouse().catch((error) => {
  console.error("Failed to initialize GHN warehouse:", error.message);
  console.log("GHN API will use fallback shipping fees");
});

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
const couponRoutes = require("./routes/couponRoutes");
const ghnRoutes = require("./routes/ghnRoutes");
const specificationRoutes = require("./routes/specificationRoutes");
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
app.use("/api/coupons", couponRoutes);
app.use("/api/ghn", ghnRoutes);
app.use("/api/specifications", specificationRoutes);

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
