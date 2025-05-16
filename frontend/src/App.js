import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { store } from "./redux/store";
import Navbar from "./components/Navbar";
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

function App() {
  return (
    <Provider store={store}>
      <Router>
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
            <Route path="/payment/vnpay_return" element={<VNPayResult />} />

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
                <Route
                  path="orders/:id"
                  element={<AdminOrderDetailPage />}
                />{" "}
                {/* Route for order details */}
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="users/edit/:id" element={<UserEditPage />} />
                <Route path="categories" element={<AdminCategoriesPage />} />
                <Route path="categories/new" element={<CategoryFormPage />} />
                <Route path="categories/edit/:id" element={<CategoryFormPage />} />
              </Route>
            </Route>
          </Routes>
          <ToastContainer />
        </div>
      </Router>
    </Provider>
  );
}

export default App;
