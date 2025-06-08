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
    <div className="bg-gray-800 shadow-lg rounded-lg p-8 mb-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-4 flex items-center">
        <FaTicketAlt className="text-purple-500 mr-2" /> Mã giảm giá của tôi
      </h2>

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
    <div className="bg-gray-700 rounded-lg p-6 mb-4 border border-purple-500 relative">
      <RefreshButton onRefresh={refreshCouponStatus} refreshing={refreshing} />
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 pt-2">
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
      className="absolute top-4 right-4 text-gray-400 hover:text-gray-300 p-1.5 rounded-full hover:bg-gray-600 transition-colors text-sm"
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
      <h3 className="text-xl font-bold text-gray-100">
        Giảm {coupon.discountPercent}% cho đơn hàng đầu tiên
      </h3>
      <div className="flex items-center mt-1">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          coupon.used ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'
        }`}>
          <span className={`w-2 h-2 rounded-full mr-1 ${
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
    <div className="flex flex-col items-end mt-2 md:mt-0">
      <div className="text-3xl font-bold text-purple-400">{coupon.code}</div>
      {!coupon.used && (
        <button
          onClick={handleCopyCode}
          className="text-xs text-purple-400 hover:text-purple-300 mt-1 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Nhấn để sao chép
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
    <div className="text-center py-8 bg-gray-700 rounded-lg">
      <svg className="mx-auto h-16 w-16 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
      
      <h3 className="text-xl font-medium text-gray-200 mb-2">
        Bạn chưa có mã giảm giá
      </h3>
      
      <p className="text-gray-400 mb-6 px-6">
        Tạo mã giảm giá 30% cho đơn hàng đầu tiên của bạn
      </p>
      
      <button
        onClick={handleGenerateCoupon}
        disabled={generating}
        className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-md transition duration-300 inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generating ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Đang tạo...
          </>
        ) : (
          <>
            <FaTicketAlt className="mr-2" /> Tạo mã giảm giá
          </>
        )}
      </button>
    </div>
  );
}

export default CouponSection;
