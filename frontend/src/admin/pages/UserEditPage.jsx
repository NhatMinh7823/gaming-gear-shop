import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AddressList from '../components/AddressList'; 
import ReviewList from '../components/ReviewList';

const UserEditPage = () => {
  const { id: userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // New states for addresses and reviews
  const [addresses, setAddresses] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState('role');


  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        
        // Fetch all data in parallel
        const [userRes, addressesRes, reviewsRes] = await Promise.all([
          api.get(`/users/${userId}`),
          api.get(`/users/${userId}/addresses`),
          api.get(`/users/${userId}/reviews`)
        ]);

        setUser(userRes.data.user);
        setRole(userRes.data.user.role);
        setName(userRes.data.user.name);
        setEmail(userRes.data.user.email);
        setAddresses(addressesRes.data.addresses);
        setReviews(reviewsRes.data.reviews);

        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Không thể tải dữ liệu người dùng');
        console.error("Error fetching user data:", err);
      } finally {
        setLoadingData(false);
        setLoading(false); // Also set the main loading to false
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      await api.put(`/users/${userId}`, { role, name, email }); // Admin update user (role, name, email)
      setSuccessMessage('Cập nhật thông tin người dùng thành công!');
      setTimeout(() => {
        navigate('/admin/users');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Cập nhật thông tin người dùng thất bại');
      console.error("Error updating user info:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="text-red-500 p-4 bg-red-100 rounded-md flex items-center justify-between">
        <span>Error: {error}</span>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg shadow">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Không tìm thấy người dùng</h3>
        <p className="mt-1 text-sm text-gray-500">Không thể tìm thấy người dùng yêu cầu hoặc có lỗi khi tải thông tin chi tiết.</p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/admin/users')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Quay lại danh sách người dùng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button 
        onClick={() => navigate('/admin/users')} 
        className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Quay lại danh sách người dùng
      </button>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* User Info Header */}
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
            <div className="bg-gray-100 p-3 rounded-full">
              <svg className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">{user.name}</h1>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('role')}
              className={`${
                activeTab === 'role'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Quản lý vai trò
            </button>
            <button
              onClick={() => setActiveTab('addresses')}
              className={`${
                activeTab === 'addresses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Quản lý địa chỉ
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`${
                activeTab === 'reviews'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Quản lý đánh giá
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          {loadingData ? (
             <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
             </div>
          ) : (
            <>
              {activeTab === 'role' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Chỉnh sửa vai trò</h2>
                  {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </div>
                  )}
                  
                  {successMessage && (
                    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md flex items-center">
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {successMessage}
                    </div>
                  )}

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (window.confirm(`Bạn có chắc muốn lưu thay đổi thông tin người dùng này?`)) {
                      handleSubmit(e);
                    }
                  }} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Tên người dùng
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                        Vai trò
                      </label>
                      <div className="mt-1 relative">
                        <select
                          name="role"
                          id="role"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          required
                        >
                          <option value="user">Người dùng</option>
                          <option value="admin">Quản trị viên</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => navigate('/admin/users')}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={loading || (role === user.role && name === user.name && email === user.email)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                            Đang cập nhật...
                          </>
                        ) : 'Lưu thay đổi'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              {activeTab === 'addresses' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Địa chỉ của người dùng</h2>
                  <AddressList addresses={addresses} userId={userId} onUpdate={() => {
                    const fetchData = async () => {
                        const addressesRes = await api.get(`/users/${userId}/addresses`);
                        setAddresses(addressesRes.data.addresses);
                    };
                    fetchData();
                  }} />
                </div>
              )}
              {activeTab === 'reviews' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Đánh giá của người dùng</h2>
                  <ReviewList reviews={reviews} onUpdate={() => {
                     const fetchData = async () => {
                        const reviewsRes = await api.get(`/users/${userId}/reviews`);
                        setReviews(reviewsRes.data.reviews);
                    };
                    fetchData();
                  }} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserEditPage;
