import React from 'react';
import { Link, Outlet } from 'react-router-dom';

const AdminLayout = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white p-6">
        <div className="mb-8">
          <Link to="/admin" className="text-2xl font-semibold hover:text-gray-300">
            Bảng điều khiển quản trị
          </Link>
        </div>
        <nav>
          <ul>
            <li className="mb-4">
              <Link
                to="/admin/dashboard"
                className="block py-2 px-4 rounded hover:bg-gray-700"
              >
                Tổng quan
              </Link>
            </li>
            <li className="mb-4">
              <Link
                to="/admin/products"
                className="block py-2 px-4 rounded hover:bg-gray-700"
              >
                Quản lý sản phẩm
              </Link>
            </li>
            <li className="mb-4">
              <Link
                to="/admin/orders"
                className="block py-2 px-4 rounded hover:bg-gray-700"
              >
                Quản lý đơn hàng
              </Link>
            </li>
            <li className="mb-4">
              <Link
                to="/admin/users"
                className="block py-2 px-4 rounded hover:bg-gray-700"
              >
                Quản lý người dùng
              </Link>
            </li>
            <li className="mb-4">
              <Link
                to="/admin/categories"
                className="block py-2 px-4 rounded hover:bg-gray-700"
              >
                Quản lý danh mục
              </Link>
            </li>
            {/* Add more admin links here as needed */}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet /> {/* This is where nested admin routes will render their components */}
      </main>
    </div>
  );
};

export default AdminLayout;
