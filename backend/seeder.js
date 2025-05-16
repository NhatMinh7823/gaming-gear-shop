const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

// Load env vars
dotenv.config();

// Load models
const User = require("./models/userModel");
const Category = require("./models/categoryModel");
const Product = require("./models/productModel");
const Order = require("./models/orderModel");
const Review = require("./models/reviewModel");
const Cart = require("./models/cartModel");

// Connect to DB
mongoose
  .connect(
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gaming-gear-shop"
  )
  .then(() => console.log("MongoDB connected for seeding"))
  .catch((err) => console.log(err));

// Sample data
const users = [
  {
    name: "Admin User",
    email: "admin@example.com",
    password: bcrypt.hashSync("123456", 10),
    role: "admin",
    phone: "123-456-7890",
    address: {
      street: "123 Admin St",
      city: "Admin City",
      state: "Admin State",
      postalCode: "12345",
      country: "Admin Country",
    },
  },
  {
    name: "John Doe",
    email: "john@example.com",
    password: bcrypt.hashSync("123456", 10),
    role: "user",
    phone: "123-456-7890",
    address: {
      street: "123 Main St",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "USA",
    },
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    password: bcrypt.hashSync("123456", 10),
    role: "user",
    phone: "123-456-7890",
    address: {
      street: "456 Elm St",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90001",
      country: "USA",
    },
  },
];

const categories = [
  {
    name: "Keyboards",
    slug: "keyboards",
    description:
      "Gaming keyboards with mechanical switches for faster response times",
    featured: true,
    image: {
      public_id: "keyboards.jpg",
      url: "/uploads/images/categories/keyboards.jpg",
    },
  },
  {
    name: "Mice",
    slug: "mice",
    description: "Gaming mice with high DPI sensors for precise movements",
    featured: true,
    image: {
      public_id: "mice.jpg",
      url: "/uploads/images/categories/mice.jpg",
    },
  },
  {
    name: "Headsets",
    slug: "headsets",
    description:
      "Gaming headsets with surround sound for immersive gaming experience",
    featured: true,
    image: {
      public_id: "headsets.jpg",
      url: "/uploads/images/categories/headsets.jpg",
    },
  },
  {
    name: "Monitors",
    slug: "monitors",
    description: "Gaming monitors with high refresh rates for smooth gameplay",
    featured: true,
    image: {
      public_id: "monitors.jpg",
      url: "/uploads/images/categories/monitors.jpg",
    },
  },
  {
    name: "Gaming Laptops",
    slug: "gaming-laptops",
    description: "High-performance laptops designed for gaming",
    featured: true,
    image: {
      public_id: "gaming-laptops.jpg",
      url: "/uploads/images/categories/gaming-laptops.jpg",
    },
  },
  {
    name: "Gaming PCs",
    slug: "gaming-pcs",
    description:
      "Pre-built gaming computers for high-performance gaming experience",
    featured: true,
    image: {
      public_id: "gaming-pcs.jpg",
      url: "/uploads/images/categories/gaming-pcs.jpg",
    },
  },
];

const products = [
  {
    name: "Logitech G Pro X Mechanical Gaming Keyboard",
    description:
      "Professional-grade gaming keyboard with swappable switches, RGB lighting, and compact tenkeyless design for competitive gaming.",
    price: 149.99,
    discountPrice: 129.99,
    category: null, // Will be set after category creation
    brand: "Logitech",
    stock: 50,
    sold: 25,
    images: [
      {
        public_id: "logitech-keyboard-1",
        url: "https://example.com/images/products/logitech-keyboard-1.jpg",
      },
      {
        public_id: "logitech-keyboard-2",
        url: "https://example.com/images/products/logitech-keyboard-2.jpg",
      },
    ],
    specifications: {
      type: "Mechanical",
      switches: "GX Blue Clicky",
      connectivity: "Wired USB",
      backlight: "RGB",
      layout: "Tenkeyless",
    },
    features: [
      "Swappable switches",
      "Customizable RGB lighting",
      "Programmable keys",
      "Detachable cable",
    ],
    isFeatured: true,
    isNewArrival: true,
    averageRating: 4.7,
    numReviews: 150,
  },
  {
    name: "Razer DeathAdder V3 Pro Gaming Mouse",
    description:
      "Ultra-lightweight wireless gaming mouse with 30K DPI optical sensor for precise tracking and responsive clicks.",
    price: 149.99,
    discountPrice: 129.99,
    category: null, // Will be set after category creation
    brand: "Razer",
    stock: 40,
    sold: 30,
    images: [
      {
        public_id: "razer-mouse-1",
        url: "https://example.com/images/products/razer-mouse-1.jpg",
      },
      {
        public_id: "razer-mouse-2",
        url: "https://example.com/images/products/razer-mouse-2.jpg",
      },
    ],
    specifications: {
      sensor: "Focus Pro 30K Optical",
      connectivity: "Wireless",
      weight: "64g",
      battery: "Up to 90 hours",
      dpi: "Up to 30,000",
    },
    features: [
      "Ultra-lightweight design",
      "Long battery life",
      "Razer HyperSpeed Wireless",
      "5 programmable buttons",
    ],
    isFeatured: true,
    isNewArrival: true,
    averageRating: 4.8,
    numReviews: 120,
  },
  {
    name: "SteelSeries Arctis Nova Pro Wireless Gaming Headset",
    description:
      "Premium wireless gaming headset with active noise cancellation, hot-swappable batteries, and immersive audio quality.",
    price: 349.99,
    discountPrice: 299.99,
    category: null, // Will be set after category creation
    brand: "SteelSeries",
    stock: 30,
    sold: 20,
    images: [
      {
        public_id: "steelseries-headset-1",
        url: "https://example.com/images/products/steelseries-headset-1.jpg",
      },
      {
        public_id: "steelseries-headset-2",
        url: "https://example.com/images/products/steelseries-headset-2.jpg",
      },
    ],
    specifications: {
      type: "Over-ear",
      connectivity: "Dual Wireless (2.4GHz & Bluetooth)",
      microphone: "Retractable bidirectional noise-canceling",
      battery: "Dual swappable batteries (20 hours each)",
      frequency: "10-40,000 Hz",
    },
    features: [
      "Active Noise Cancellation",
      "Hot-swappable battery system",
      "Multi-system compatibility",
      "Hi-res capable speakers",
    ],
    isFeatured: true,
    isNewArrival: false,
    averageRating: 4.6,
    numReviews: 85,
  },
  {
    name: "ASUS ROG Swift 360Hz PG259QN Gaming Monitor",
    description:
      "Ultra-fast 24.5-inch gaming monitor with 360Hz refresh rate, 1ms response time, and NVIDIA G-SYNC for competitive gaming.",
    price: 699.99,
    discountPrice: 599.99,
    category: null, // Will be set after category creation
    brand: "ASUS",
    stock: 25,
    sold: 15,
    images: [
      {
        public_id: "asus-monitor-1",
        url: "https://example.com/images/products/asus-monitor-1.jpg",
      },
      {
        public_id: "asus-monitor-2",
        url: "https://example.com/images/products/asus-monitor-2.jpg",
      },
    ],
    specifications: {
      size: '24.5"',
      resolution: "1920 x 1080 (Full HD)",
      refresh_rate: "360Hz",
      response_time: "1ms GTG",
      panel: "Fast IPS",
    },
    features: [
      "NVIDIA G-SYNC technology",
      "Ultra-fast 360Hz refresh rate",
      "ASUS Eye Care technology",
      "Ergonomic stand with tilt, swivel, pivot, and height adjustment",
    ],
    isFeatured: false,
    isNewArrival: true,
    averageRating: 4.5,
    numReviews: 70,
  },
  {
    name: "MSI Raider GE76 Gaming Laptop",
    description:
      "Powerful gaming laptop with Intel Core i9 processor, NVIDIA RTX 3080 Ti, and advanced cooling system for peak gaming performance.",
    price: 3499.99,
    discountPrice: 3199.99,
    category: null, // Will be set after category creation
    brand: "MSI",
    stock: 15,
    sold: 8,
    images: [
      {
        public_id: "msi-laptop-1",
        url: "https://example.com/images/products/msi-laptop-1.jpg",
      },
      {
        public_id: "msi-laptop-2",
        url: "https://example.com/images/products/msi-laptop-2.jpg",
      },
    ],
    specifications: {
      processor: "Intel Core i9-12900HK",
      graphics: "NVIDIA GeForce RTX 3080 Ti 16GB GDDR6",
      memory: "32GB DDR5",
      storage: "2TB NVMe SSD",
      display: '17.3" QHD 240Hz',
    },
    features: [
      "MSI Cooler Boost 5 technology",
      "Per-key RGB SteelSeries keyboard",
      "Dynaudio sound system",
      "Thunderbolt 4 connectivity",
    ],
    isFeatured: true,
    isNewArrival: true,
    averageRating: 4.9,
    numReviews: 45,
  },
  {
    name: "NZXT H510 Elite Premium Mid-Tower PC Gaming Case",
    description:
      "Tempered glass gaming case with RGB lighting, excellent cable management, and optimized airflow for high-performance PC builds.",
    price: 149.99,
    discountPrice: 129.99,
    category: null, // Will be set after category creation
    brand: "NZXT",
    stock: 35,
    sold: 22,
    images: [
      {
        public_id: "nzxt-case-1",
        url: "https://example.com/images/products/nzxt-case-1.jpg",
      },
      {
        public_id: "nzxt-case-2",
        url: "https://example.com/images/products/nzxt-case-2.jpg",
      },
    ],
    specifications: {
      type: "Mid-Tower",
      material: "Steel, Tempered Glass",
      motherboards: "Mini-ITX, MicroATX, ATX",
      dimensions: "210mm x 460mm x 428mm",
      weight: "7.5kg",
    },
    features: [
      "Dual-tempered glass panels",
      "Built-in RGB lighting",
      "Vertical GPU mount",
      "Cable management system",
    ],
    isFeatured: false,
    isNewArrival: true,
    averageRating: 4.6,
    numReviews: 110,
  },
];

// Import Data
const importData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Category.deleteMany();
    await Product.deleteMany();
    await Order.deleteMany();
    await Review.deleteMany();
    await Cart.deleteMany();

    console.log("Data cleared...");

    // Import users
    const createdUsers = await User.insertMany(users);
    console.log("Users imported...");

    // Import categories
    const createdCategories = await Category.insertMany(categories);
    console.log("Categories imported...");

    // Set category IDs for products
    const keyboardCategory = createdCategories.find(
      (cat) => cat.name === "Keyboards"
    );
    const mouseCategory = createdCategories.find((cat) => cat.name === "Mice");
    const headsetCategory = createdCategories.find(
      (cat) => cat.name === "Headsets"
    );
    const monitorCategory = createdCategories.find(
      (cat) => cat.name === "Monitors"
    );
    const laptopCategory = createdCategories.find(
      (cat) => cat.name === "Gaming Laptops"
    );
    const pcCategory = createdCategories.find(
      (cat) => cat.name === "Gaming PCs"
    );

    products[0].category = keyboardCategory._id;
    products[1].category = mouseCategory._id;
    products[2].category = headsetCategory._id;
    products[3].category = monitorCategory._id;
    products[4].category = laptopCategory._id;
    products[5].category = pcCategory._id;

    // Import products
    const createdProducts = await Product.insertMany(products);
    console.log("Products imported...");

    // Create sample reviews
    const adminUser = createdUsers.find((user) => user.role === "admin");
    const johnUser = createdUsers.find(
      (user) => user.email === "john@example.com"
    );

    const reviews = [
      {
        user: adminUser._id,
        product: createdProducts[0]._id,
        rating: 5,
        title: "Great keyboard!",
        comment:
          "The switches feel amazing and the RGB lighting is fantastic. Highly recommended!",
        isVerifiedPurchase: true,
      },
      {
        user: johnUser._id,
        product: createdProducts[1]._id,
        rating: 4,
        title: "Excellent mouse",
        comment: "Very lightweight and responsive. Perfect for FPS games.",
        isVerifiedPurchase: true,
      },
    ];

    await Review.insertMany(reviews);
    console.log("Reviews imported...");

    // Create sample order
    const order = {
      user: johnUser._id,
      orderItems: [
        {
          name: createdProducts[0].name,
          quantity: 1,
          image: createdProducts[0].images[0].url,
          price: createdProducts[0].discountPrice || createdProducts[0].price,
          product: createdProducts[0]._id,
        },
      ],
      shippingAddress: {
        street: "123 Main St",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "USA",
      },
      paymentMethod: "PayPal",
      taxPrice: 20,
      shippingPrice: 10,
      totalPrice:
        (createdProducts[0].discountPrice || createdProducts[0].price) + 30,
      isPaid: true,
      paidAt: Date.now(),
      status: "Delivered",
      isDelivered: true,
      deliveredAt: Date.now(),
    };

    await Order.create(order);
    console.log("Order imported...");

    console.log("Data import complete!");
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Delete Data
const destroyData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Category.deleteMany();
    await Product.deleteMany();
    await Order.deleteMany();
    await Review.deleteMany();
    await Cart.deleteMany();

    console.log("Data destroyed!");
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Check command arguments
if (process.argv[2] === "-d") {
  destroyData();
} else {
  importData();
}
