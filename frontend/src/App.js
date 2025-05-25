import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Provider, useSelector } from "react-redux";
import { ToastContainer } from "react-toastify";
import { useEffect } from "react";
import "react-toastify/dist/ReactToastify.css";
import { store } from "./redux/store";
import Navbar from "./components/Navbar";
import useWishlist from "./hooks/useWishlist";
import HomePage from "./pages/HomePage";
import ProductPage from "./pages/ProductPage";
import ProductsPage from "./pages/ProductsPage";
import CartPage from "./pages/CartPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import OrderPage from "./pages/OrderPage";
import OrdersPage from "./pages/OrdersPage";
import VNPayResult from "./pages/VNPayResult";
import PaymentErrorPage from "./pages/PaymentErrorPage";

// Admin components
import AdminLayout from "./admin/components/AdminLayout";
import DashboardPage from "./admin/pages/DashboardPage";
import AdminProductsPage from "./admin/pages/AdminProductsPage";
import AdminOrdersPage from "./admin/pages/AdminOrdersPage";
import AdminUsersPage from "./admin/pages/AdminUsersPage";
import ProductFormPage from "./admin/pages/ProductFormPage";
import UserEditPage from "./admin/pages/UserEditPage";
import AdminOrderDetailPage from "./admin/pages/AdminOrderDetailPage"; // Import AdminOrderDetailPage
import AdminRoute from "./components/AdminRoute";
import AdminCategoriesPage from "./admin/pages/AdminCategoriesPage"; // Import AdminOrderDetailPage
import CategoryFormPage from "./admin/pages/CategoryFormPage";
import Chatbot from "./components/Chatbot/Chatbot";

// Component con chứa nội dung của ứng dụng
function AppContent() {
  // Use custom hook to load wishlist when user logs in
  const { refreshWishlist } = useWishlist();
  const { userInfo } = useSelector((state) => state.user);
  // Only load wishlist data once when the user first logs in
  useEffect(() => {
    // We don't need to call refreshWishlist here - the useWishlist hook
    // already handles loading data when user logs in
    // This prevents duplicate API calls
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 pt-[80px]">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/order/:id" element={<OrderPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/vnpay-result" element={<VNPayResult />} />
        <Route path="/payment-error" element={<PaymentErrorPage />} />
        {/* Admin Routes - Protected by AdminRoute */}
        <Route path="/admin" element={<AdminRoute />}>
          {/* AdminLayout is now a child of AdminRoute's Outlet */}
          <Route element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/edit/:id" element={<ProductFormPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:id" element={<AdminOrderDetailPage />} />{" "}
            {/* Route for order details */}
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/edit/:id" element={<UserEditPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="categories/new" element={<CategoryFormPage />} />
            <Route path="categories/edit/:id" element={<CategoryFormPage />} />
          </Route>
        </Route>{" "}
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ marginTop: "90px" }} // Điều chỉnh margin-top để không che khuất navbar
      />

      {/* Chatbot - Available on all pages */}
      <Chatbot />
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
}

export default App;
