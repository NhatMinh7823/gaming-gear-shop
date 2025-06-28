import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { login, getWishlist } from '../services/api';
import { setCredentials, updateWishlist } from '../redux/slices/userSlice';
import { setWishlist } from '../redux/slices/wishlistSlice';
import { FaLock, FaEnvelope, FaSignInAlt } from 'react-icons/fa';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await login({ email, password });
      dispatch(setCredentials({ ...data.user, token: data.token }));

      // Load wishlist data after successful login
      try {
        const wishlistResponse = await getWishlist();
        if (wishlistResponse.data.success && wishlistResponse.data.wishlist) {
          const wishlistIds = wishlistResponse.data.wishlist.map(item => item._id || item);
          dispatch(updateWishlist(wishlistIds));
          dispatch(setWishlist(wishlistIds));
        }
      } catch (error) {
        console.error('Không thể tải danh sách yêu thích:', error);
      }

      navigate('/');
      toast.success('Đăng nhập thành công! Chào mừng bạn quay trở lại!');
    } catch (error) {
      toast.error('Đăng nhập thất bại! Vui lòng kiểm tra thông tin và thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background design elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-600 opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute top-2/3 -right-20 w-96 h-96 bg-purple-600 opacity-10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative">
        <div className="text-center">
          <h2 className="mt-6 text-4xl font-extrabold text-gray-100 tracking-wider">
            <span className="bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text">
              ĐĂNG NHẬP GAME THỦ
            </span>
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Truy cập tài khoản Gaming Gear của bạn
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8 backdrop-blur-sm bg-opacity-80">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-lg 
                           bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 
                           focus:border-transparent shadow-sm"
                  placeholder="Nhập email của bạn"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-lg 
                           bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 
                           focus:border-transparent shadow-sm"
                  placeholder="Nhập mật khẩu"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 bg-gray-700 border-gray-600 rounded accent-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                  Ghi nhớ đăng nhập
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent 
                         rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 
                         hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                         font-medium shadow-sm transform transition-all duration-200 hover:-translate-y-1 
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <FaSignInAlt className="h-5 w-5 text-blue-300" />
                </span>
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </>
                ) : 'Đăng nhập'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Gaming Gear Shop. Đã đăng ký bản quyền.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;