// CouponSection.jsx - User coupon management component
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { FaTicketAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { generateCoupon, getProfile } from '../../services/api';
import { setCredentials } from '../../redux/slices/userSlice';
import { formatDate, copyCouponToClipboard } from '../../utils';

function CouponSection({ userInfo }) {
  const dispatch = useDispatch();

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl rounded-xl p-8 mb-8 border border-gray-700">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-4">
          <FaTicketAlt className="text-white text-xl" />
        </div>
        <h2 className="text-2xl font-bold text-gray-100">Mã giảm giá của tôi</h2>
      </div>

      {userInfo?.coupon?.code ? (
        <ExistingCoupon userInfo={userInfo} dispatch={dispatch} />
      ) : (
        <CreateCoupon userInfo={userInfo} dispatch={dispatch} />
      )}
    </div>
  );
}

function ExistingCoupon({ userInfo, dispatch }) {
  const [refreshing, setRefreshing] = useState(false);

  const refreshCouponStatus = async () => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      const { data } = await getProfile();
      if (data.user.coupon) {
        dispatch(setCredentials({
          ...userInfo,
          coupon: data.user.coupon
        }));

        if (data.user.coupon.used) {
          toast.info('Mã giảm giá của bạn đã được sử dụng.');
        } else {
          toast.success('Mã giảm giá của bạn vẫn có thể sử dụng!');
        }
      }
    } catch (error) {
      toast.error('Không thể cập nhật trạng thái mã giảm giá.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/50 relative backdrop-blur-sm">
      <RefreshButton onRefresh={refreshCouponStatus} refreshing={refreshing} />
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 pt-2">
        <CouponInfo coupon={userInfo.coupon} />
        <CouponCode coupon={userInfo.coupon} />
      </div>
      
      <CouponDetails coupon={userInfo.coupon} />
    </div>
  );
}

function RefreshButton({ onRefresh, refreshing }) {
  return (
    <button
      onClick={onRefresh}
      disabled={refreshing}
      className="absolute top-4 right-4 text-purple-400 hover:text-purple-300 p-2 rounded-lg hover:bg-purple-500/20 transition-all duration-200 transform hover:scale-110"
      title="Làm mới trạng thái"
    >
      {refreshing ? (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )}
    </button>
  );
}

function CouponInfo({ coupon }) {
  return (
    <div>
      <h3 className="text-2xl font-bold text-gray-100 mb-2">
        Giảm {coupon.discountPercent}% cho đơn hàng đầu tiên
      </h3>
      <div className="flex items-center">
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
          coupon.used 
            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
            : 'bg-green-500/20 text-green-400 border border-green-500/30'
        }`}>
          <span className={`w-2.5 h-2.5 rounded-full mr-2 ${
            coupon.used ? 'bg-red-400' : 'bg-green-400'
          }`}></span>
          {coupon.used ? 'Đã sử dụng' : 'Có thể sử dụng'}
        </span>
      </div>
    </div>
  );
}

function CouponCode({ coupon }) {
  const handleCopyCode = async () => {
    const success = await copyCouponToClipboard(coupon.code);
    if (success) {
      toast.success('Mã giảm giá đã được sao chép!');
    } else {
      toast.error('Không thể sao chép mã giảm giá');
    }
  };

  return (
    <div className="flex flex-col items-end mt-4 md:mt-0">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl text-center">
        <div className="text-xs font-medium text-purple-100 mb-1">MÃ GIẢM GIÁ</div>
        <div className="text-2xl font-bold tracking-wider">{coupon.code}</div>
      </div>
      {!coupon.used && (
        <button
          onClick={handleCopyCode}
          className="mt-3 text-sm text-purple-400 hover:text-purple-300 flex items-center bg-purple-500/10 px-3 py-1.5 rounded-lg hover:bg-purple-500/20 transition-all duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Sao chép mã
        </button>
      )}
    </div>
  );
}

function CouponDetails({ coupon }) {
  return (
    <div className="border-t border-gray-600 pt-4 mt-2">
      {coupon.used ? (
        <UsedCouponMessage />
      ) : (
        <ActiveCouponMessage discountPercent={coupon.discountPercent} />
      )}
      
      {coupon.createdAt && (
        <p className="text-gray-400 text-xs mt-2">
          Ngày tạo: {formatDate(coupon.createdAt, 'SHORT_DATE')}
        </p>
      )}
    </div>
  );
}

function UsedCouponMessage() {
  return (
    <div className="text-gray-300 text-sm">
      <p>Mã giảm giá này đã được sử dụng và không thể dùng lại.</p>
      <p className="mt-1 text-gray-400">Mã giảm giá chỉ có thể sử dụng một lần cho đơn hàng đầu tiên.</p>
    </div>
  );
}

function ActiveCouponMessage({ discountPercent }) {
  return (
    <div className="text-gray-300 text-sm">
      <p>
        Sao chép mã này và nhập vào ô mã giảm giá khi thanh toán để được giảm{' '}
        <span className="font-semibold text-purple-400">{discountPercent}%</span>{' '}
        tổng giá trị đơn hàng.
      </p>
      <p className="mt-1 text-gray-400">
        Mã giảm giá này chỉ có thể sử dụng một lần cho đơn hàng đầu tiên của bạn.
      </p>
    </div>
  );
}

function CreateCoupon({ userInfo, dispatch }) {
  const [generating, setGenerating] = useState(false);

  const handleGenerateCoupon = async () => {
    if (generating) return;

    setGenerating(true);
    try {
      const { data } = await generateCoupon();
      if (data.success) {
        dispatch(setCredentials({
          ...userInfo,
          coupon: data.coupon
        }));
        toast.success('Đã tạo mã giảm giá 30% thành công!');
      }
    } catch (error) {
      toast.error('Không thể tạo mã giảm giá. Vui lòng thử lại sau!');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="text-center py-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl">
      <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      </div>
      
      <h3 className="text-2xl font-semibold text-gray-100 mb-3">
        Bạn chưa có mã giảm giá
      </h3>
      
      <p className="text-gray-400 mb-8 px-6 max-w-md mx-auto">
        Tạo mã giảm giá 30% độc quyền cho đơn hàng đầu tiên của bạn và tiết kiệm ngay hôm nay!
      </p>
      
      <button
        onClick={handleGenerateCoupon}
        disabled={generating}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg transition-all duration-200 inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
      >
        {generating ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Đang tạo mã...
          </>
        ) : (
          <>
            <FaTicketAlt className="mr-3" /> Tạo mã giảm giá 30%
          </>
        )}
      </button>
    </div>
  );
}

export default CouponSection;
