import React, { useState } from 'react';
import api from '../../services/api';

const ReviewList = ({ reviews, onUpdate }) => {
  if (!reviews || reviews.length === 0) {
    return <p className="text-gray-500">Người dùng này chưa viết bài đánh giá nào.</p>;
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewItem key={review._id} review={review} onUpdate={onUpdate} />
      ))}
    </div>
  );
};

function ReviewItem({ review, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    rating: review.rating,
    title: review.title,
    comment: review.comment,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      rating: review.rating,
      title: review.title,
      comment: review.comment,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      rating: review.rating,
      title: review.title,
      comment: review.comment,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editData.rating < 1 || editData.rating > 5) {
      alert('Vui lòng chọn số sao từ 1 đến 5');
      return;
    }
    if (!editData.title.trim()) {
      alert('Vui lòng nhập tiêu đề đánh giá');
      return;
    }
    if (!editData.comment.trim()) {
      alert('Vui lòng nhập nội dung đánh giá');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.put(`/reviews/${review._id}`, {
        rating: editData.rating,
        title: editData.title,
        comment: editData.comment,
      });
      alert('Cập nhật đánh giá thành công');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi khi cập nhật đánh giá');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa bài đánh giá này?')) return;
    try {
      await api.delete(`/reviews/${review._id}`);
      alert('Xóa đánh giá thành công.');
      onUpdate();
    } catch (error) {
      alert('Lỗi khi xóa đánh giá: ' + (error.response?.data?.message || error.message));
    }
  };

  // Removed handleToggleHidden and hidden logic

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="mb-2">
            <p className="font-semibold text-blue-600">{review.product?.name || 'Sản phẩm không xác định'}</p>
            <p className="text-sm text-gray-500">
              Đánh giá lúc: {new Date(review.createdAt).toLocaleDateString('vi-VN')}
            </p>
          </div>
          <div className="flex items-center mb-1">
            {[...Array(5)].map((_, i) => (
              <button
                key={i}
                type="button"
                className={`w-5 h-5 focus:outline-none ${i < editData.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                onClick={() => setEditData((prev) => ({ ...prev, rating: i + 1 }))}
                disabled={isSubmitting}
              >
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
            <span className="ml-2 text-sm text-gray-500">({editData.rating}/5 sao)</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
            <input
              type="text"
              value={editData.title}
              onChange={(e) => setEditData((prev) => ({ ...prev, title: e.target.value }))}
              disabled={isSubmitting}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
            <textarea
              value={editData.comment}
              onChange={(e) => setEditData((prev) => ({ ...prev, comment: e.target.value }))}
              disabled={isSubmitting}
              className="w-full border rounded px-3 py-2"
              rows={3}
              required
            />
          </div>
          {/* Ẩn đánh giá đã bị loại bỏ */}
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex justify-between items-start">
          <div>
            <div className="mb-2">
              <p className="font-semibold text-blue-600">{review.product?.name || 'Sản phẩm không xác định'}</p>
              <p className="text-sm text-gray-500">
                Đánh giá lúc: {new Date(review.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <div className="flex items-center mb-1">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <h4 className="font-bold text-gray-800">{review.title}</h4>
            <p className="text-gray-700 mt-1">{review.comment}</p>
            {/* Ẩn đánh giá đã bị loại bỏ */}
          </div>
          <div className="flex flex-col space-y-2 ml-4">
            <button
              onClick={handleEdit}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Sửa
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              Xóa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewList;
