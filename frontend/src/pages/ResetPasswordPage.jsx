import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { PASSWORD_RESET, AUTH } from '../utils/toastMessages';
import { resetPassword } from '../services/api';
import { setCredentials } from '../redux/slices/userSlice';
import { FaLock, FaKey, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';

function ResetPasswordPage() {
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!resetToken) {
      toast.error(PASSWORD_RESET.TOKEN_REQUIRED);
      return;
    }

    if (password.length < 6) {
      toast.error(AUTH.PASSWORD_MIN_LENGTH);
      return;
    }

    if (password !== confirmPassword) {
      toast.error(AUTH.PASSWORD_MISMATCH);
      return;
    }

    setLoading(true);
    try {
      const { data } = await resetPassword({ resetToken, password });
      
      if (data.success) {
        // Auto login after successful password reset
        dispatch(setCredentials({ ...data.user, token: data.token }));
        
        toast.success(PASSWORD_RESET.RESET_SUCCESS);
        navigate('/');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra! Vui lòng thử lại.';
      toast.error(errorMessage);
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

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-6">
            <FaLock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Reset mật khẩu
          </h2>
          <p className="text-gray-400 text-sm">
            Nhập mã reset và mật khẩu mới của bạn
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8 backdrop-blur-sm bg-opacity-80">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Mã Reset
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaKey className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-lg 
                           bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 
                           focus:border-transparent shadow-sm font-mono"
                  placeholder="Nhập mã reset từ email"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Mã reset có hiệu lực trong 10 phút
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Mật khẩu mới
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
                  placeholder="Nhập mật khẩu mới"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Mật khẩu phải có ít nhất 6 ký tự
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-lg 
                           bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 
                           focus:border-transparent shadow-sm"
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Nhập lại mật khẩu để xác nhận
              </p>
            </div>

            <div className="bg-yellow-900 bg-opacity-50 border border-yellow-700 rounded-lg p-4">
              <div className="flex items-start">
                <FaCheckCircle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-yellow-200 text-sm">
                    <strong>Lưu ý:</strong> Sau khi reset thành công, bạn sẽ được tự động đăng nhập với mật khẩu mới.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent 
                         text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 
                         hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                         focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </>
                ) : 'Reset mật khẩu'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link 
              to="/forgot-password" 
              className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Chưa có mã reset? Yêu cầu mã mới
            </Link>
            <br />
            <Link 
              to="/login" 
              className="inline-flex items-center text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              <FaArrowLeft className="mr-2 h-4 w-4" />
              Quay lại đăng nhập
            </Link>
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

export default ResetPasswordPage;
