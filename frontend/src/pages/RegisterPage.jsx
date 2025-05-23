import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { register } from '../services/api';
import { setCredentials } from '../redux/slices/userSlice';
import { FaUser, FaEnvelope, FaLock, FaUserPlus } from 'react-icons/fa';

function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fromSpecialOffer, setFromSpecialOffer] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  useEffect(() => {
    // Kiểm tra xem có email từ chương trình ưu đãi không
    const specialOfferEmail = localStorage.getItem('specialOfferEmail');
    if (specialOfferEmail) {
      setEmail(specialOfferEmail);
      setFromSpecialOffer(true);
    }

    // Trả về hàm cleanup để xóa localStorage khi component bị unmount mà chưa submit
    return () => {
      // Chỉ xóa nếu người dùng rời trang mà không đăng ký
      if (localStorage.getItem('specialOfferEmail')) {
        localStorage.removeItem('specialOfferEmail');
      }
    };
  }, []); const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      // Đăng ký với flag fromSpecialOffer nếu đến từ form ưu đãi đặc biệt
      const { data } = await register({
        name,
        email,
        password,
        fromSpecialOffer
      });

      dispatch(setCredentials({ ...data.user, token: data.token }));

      // Nếu đăng ký từ special offer, chuyển về profile để xem coupon
      if (fromSpecialOffer) {
        localStorage.removeItem('specialOfferEmail');
        navigate('/profile');
        toast.success('Đăng ký thành công! Bạn đã nhận được mã giảm giá 30% cho đơn hàng đầu tiên.');
      } else {
        navigate('/');
        toast.success('Đăng ký thành công!');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Đăng ký thất bại! Vui lòng thử lại.';

      if (errorMessage.includes('already exists')) {
        toast.error('Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background design elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600 opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-20 w-96 h-96 bg-blue-600 opacity-10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative">        <div className="text-center">
        <h2 className="mt-6 text-4xl font-extrabold text-gray-100 tracking-wider">
          <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-transparent bg-clip-text">
            JOIN THE SQUAD
          </span>
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Create your gaming gear account
        </p>
      </div>

        {fromSpecialOffer && (
          <div className="mb-6 p-4 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-purple-500/50 rounded-xl shadow-lg">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 9H10a3 3 0 013 3v1a1 1 0 102 0v-1a5 5 0 00-5-5H8.414l1.293-1.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-purple-200">Ưu đãi đặc biệt!</h3>
                <p className="text-gray-300 text-sm">Hoàn tất đăng ký để nhận ngay mã giảm giá 30% cho đơn hàng đầu tiên!</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8 backdrop-blur-sm bg-opacity-80">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Gamer Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-lg 
                           bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 
                           focus:border-transparent shadow-sm"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
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
                           bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 
                           focus:border-transparent shadow-sm"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Password
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
                           bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 
                           focus:border-transparent shadow-sm"
                  placeholder="Create a strong password"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Password must be at least 6 characters
              </p>
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                className="h-4 w-4 bg-gray-700 border-gray-600 rounded accent-purple-500 focus:ring-purple-500"
                required
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-400">
                I agree to the <span className="text-purple-400 hover:text-purple-300 cursor-pointer">Terms</span> and <span className="text-purple-400 hover:text-purple-300 cursor-pointer">Privacy Policy</span>
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent 
                         rounded-lg text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 
                         hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 
                         font-medium shadow-sm transform transition-all duration-200 hover:-translate-y-1 
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <FaUserPlus className="h-5 w-5 text-purple-300" />
                </span>
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </>
                ) : 'Create Your Account'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-purple-400 hover:text-purple-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Gaming Gear Shop. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;