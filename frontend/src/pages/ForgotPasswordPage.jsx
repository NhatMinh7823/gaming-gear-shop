import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { PASSWORD_RESET } from '../utils/toastMessages';
import { forgotPassword } from '../services/api';
import { FaEnvelope, FaArrowLeft, FaKey } from 'react-icons/fa';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error(PASSWORD_RESET.EMAIL_REQUIRED);
      return;
    }

    setLoading(true);
    try {
      const { data } = await forgotPassword({ email });
      
      if (data.success) {
        setResetToken(data.resetToken);
        setShowToken(true);
        toast.success(data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra! Vui lòng thử lại.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(resetToken);
    toast.success(PASSWORD_RESET.TOKEN_COPIED);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background design elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600 opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-20 w-96 h-96 bg-blue-600 opacity-10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mb-6">
            <FaKey className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Quên mật khẩu?
          </h2>
          <p className="text-gray-400 text-sm">
            Nhập email của bạn để nhận mã reset mật khẩu
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8 backdrop-blur-sm bg-opacity-80">
          {!showToken ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Địa chỉ Email
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
                    placeholder="Nhập email của bạn"
                    required
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent 
                           text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-blue-600 
                           hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                           focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang xử lý...
                    </>
                  ) : 'Gửi mã reset'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 bg-green-600 rounded-full flex items-center justify-center mb-4">
                  <FaKey className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Mã reset đã được tạo!
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Sao chép mã bên dưới và sử dụng để reset mật khẩu
                </p>
              </div>

              <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mã Reset (có hiệu lực trong 10 phút)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={resetToken}
                    readOnly
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-200 text-sm font-mono"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
                  >
                    Sao chép
                  </button>
                </div>
              </div>

              <div className="bg-blue-900 bg-opacity-50 border border-blue-700 rounded-lg p-4">
                <p className="text-blue-200 text-sm">
                  <strong>Lưu ý:</strong> Trong môi trường thực tế, mã này sẽ được gửi qua email. 
                  Đây là phiên bản demo nên hiển thị trực tiếp.
                </p>
              </div>

              <div>
                <Link
                  to="/reset-password"
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent 
                           text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-blue-600 
                           hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                           focus:ring-green-500 transition-all duration-200"
                >
                  Tiếp tục reset mật khẩu
                </Link>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
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

export default ForgotPasswordPage;
