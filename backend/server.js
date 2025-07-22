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
const http = require("http");
const { Server } = require("socket.io");
const chatbotService = require("./services/chatbotService");

ghnService.initializeWarehouse().catch((error) => {
  console.error("Failed to initialize GHN warehouse:", error.message);
  console.log("GHN API will use fallback shipping fees");
});

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Pass io instance to chatbotService
chatbotService.setSocketIO(io);

// Store active sessions for reconnection handling
const activeSessions = new Map(); // sessionId -> { socketId, lastActivity, userId }

// Handle Socket.IO connections
io.on("connection", (socket) => {
  console.log("🔌 A user connected with socket ID:", socket.id);

  // Handle joining session room
  socket.on("join_session", (data) => {
    const { sessionId, userId } = typeof data === 'string' ? { sessionId: data, userId: null } : data;
    
    if (sessionId) {
      socket.join(sessionId);
      socket.sessionId = sessionId;
      socket.userId = userId;
      
      // Store session info for reconnection handling
      activeSessions.set(sessionId, {
        socketId: socket.id,
        userId: userId
      });
      
      console.log(`🔌 Socket ${socket.id} joined session room: ${sessionId}${userId ? ` (User: ${userId})` : ''}`);
      socket.emit("session_joined", { 
        sessionId, 
        socketId: socket.id, 
        reconnected: false 
      });
    }
  });

  // Handle session reconnection
  socket.on("reconnect_session", (data) => {
    const { sessionId, userId } = data;
    
    if (sessionId && activeSessions.has(sessionId)) {
      const sessionInfo = activeSessions.get(sessionId);
      
      // Update session with new socket
      socket.join(sessionId);
      socket.sessionId = sessionId;
      socket.userId = userId || sessionInfo.userId;
      
      activeSessions.set(sessionId, {
        socketId: socket.id,
        userId: userId || sessionInfo.userId
      });
      
      console.log(`🔄 Socket ${socket.id} reconnected to session: ${sessionId}`);
      
      socket.emit("reconnection_success", {
        sessionId,
        message: "Session reconnected successfully"
      });
    } else {
      socket.emit("reconnection_failed", {
        sessionId,
        message: "Session not found or expired"
      });
    }
  });

  // Handle leaving session room
  socket.on("leave_session", (sessionId) => {
    if (sessionId) {
      socket.leave(sessionId);
      activeSessions.delete(sessionId);
      console.log(`🔌 Socket ${socket.id} left session room: ${sessionId}`);
    }
  });



  socket.on("disconnect", (reason) => {
    console.log(`🔌 User disconnected with socket ID: ${socket.id}, reason: ${reason}`);
    
    // Find and remove session
    for (const [sessionId, sessionInfo] of activeSessions.entries()) {
      if (sessionInfo.socketId === socket.id) {
        activeSessions.delete(sessionId);
        console.log(`🗑️ Removed session ${sessionId}`);
        break;
      }
    }
  });
});



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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
