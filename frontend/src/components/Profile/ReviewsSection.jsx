// ReviewsSection.jsx - User reviews management component
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaRegStar, FaEdit, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { updateReview, deleteReview } from '../../services/api';

function ReviewsSection({ reviews, onReviewsUpdate }) {
  return (
    <div className="bg-gray-800 shadow-lg rounded-lg p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-4">
        My Reviews
      </h2>
      
      {reviews.length === 0 ? (
        <EmptyReviews />
      ) : (
        <ReviewsList reviews={reviews} onReviewsUpdate={onReviewsUpdate} />
      )}
    </div>
  );
}

function EmptyReviews() {
  return (
    <div className="text-center py-8 text-gray-400">
      <div className="mb-4">
        <FaStar className="mx-auto h-16 w-16 text-gray-600 mb-4" />
      </div>
      <p className="mb-4 text-lg">You haven't written any reviews yet.</p>
      <p className="text-sm text-gray-500 mb-4">
        Share your experience with products you've purchased
      </p>
      <Link 
        to="/products" 
        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        Browse products to review
      </Link>
    </div>
  );
}

function ReviewsList({ reviews, onReviewsUpdate }) {
  return (
    <ul className="grid gap-6">
      {reviews.map((review) => (
        <ReviewItem
          key={review._id}
          review={review}
          onReviewsUpdate={onReviewsUpdate}
        />
      ))}
    </ul>
  );
}

function ReviewItem({ review, onReviewsUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    rating: review.rating,
    title: review.title,
    comment: review.comment
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      rating: review.rating,
      title: review.title,
      comment: review.comment
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      rating: review.rating,
      title: review.title,
      comment: review.comment
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editData.rating < 1 || editData.rating > 5) {
      toast.error('Please select a rating between 1 and 5');
      return;
    }
    
    if (!editData.title.trim()) {
      toast.error('Please provide a review title');
      return;
    }
    
    if (!editData.comment.trim()) {
      toast.error('Please provide a review comment');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await updateReview(review._id, editData);
      onReviewsUpdate(data.review);
      setIsEditing(false);
      toast.success('Review updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      await deleteReview(review._id);
      onReviewsUpdate(null, review._id); // Pass null for updated review, reviewId for deletion
      toast.success('Review deleted successfully');
    } catch (error) {
      toast.error('Error deleting review');
    }
  };

  return (
    <li className="border border-gray-700 p-6 rounded-lg hover:shadow-lg transition-shadow bg-gray-700">
      {isEditing ? (
        <EditReviewForm
          editData={editData}
          setEditData={setEditData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      ) : (
        <ReviewDisplay
          review={review}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </li>
  );
}

function ReviewDisplay({ review, onEdit, onDelete }) {
  return (
    <>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <Link 
            to={`/product/${review.product._id}`} 
            className="font-semibold text-lg text-blue-400 hover:text-blue-300 block mb-2"
          >
            {review.product.name}
          </Link>
          
          <StarRating rating={review.rating} />
        </div>
        
        <ReviewActions onEdit={onEdit} onDelete={onDelete} />
      </div>
      
      <h3 className="font-medium text-lg my-2 text-gray-200">
        {review.title}
      </h3>
      
      <p className="text-gray-400 mt-2 leading-relaxed">
        {review.comment}
      </p>
    </>
  );
}

function EditReviewForm({ editData, setEditData, onSubmit, onCancel, isSubmitting }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-gray-200 text-sm font-bold mb-2">
          Rating
        </label>
        <StarRatingInput
          rating={editData.rating}
          onChange={(rating) => setEditData(prev => ({ ...prev, rating }))}
          disabled={isSubmitting}
        />
      </div>
      
      <div>
        <label className="block text-gray-200 text-sm font-bold mb-2">
          Title
        </label>
        <input
          type="text"
          value={editData.title}
          onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
          disabled={isSubmitting}
          className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 text-gray-100 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 disabled:opacity-50"
          placeholder="Review title"
          required
        />
      </div>
      
      <div>
        <label className="block text-gray-200 text-sm font-bold mb-2">
          Comment
        </label>
        <textarea
          value={editData.comment}
          onChange={(e) => setEditData(prev => ({ ...prev, comment: e.target.value }))}
          disabled={isSubmitting}
          className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 text-gray-100 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 disabled:opacity-50"
          rows="4"
          placeholder="Write your review here"
          required
        />
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="bg-gray-600 text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center space-x-1 my-2">
      {[...Array(5)].map((_, index) => (
        <FaStar
          key={index}
          className={index < rating ? 'text-yellow-400' : 'text-gray-500'}
        />
      ))}
      <span className="text-sm text-gray-400 ml-2">
        ({rating}/5 stars)
      </span>
    </div>
  );
}

function StarRatingInput({ rating, onChange, disabled }) {
  return (
    <div className="flex space-x-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          disabled={disabled}
          className="text-xl focus:outline-none disabled:opacity-50 hover:scale-110 transition-transform"
        >
          {star <= rating ? (
            <FaStar className="text-yellow-400" />
          ) : (
            <FaRegStar className="text-gray-400" />
          )}
        </button>
      ))}
    </div>
  );
}

function ReviewActions({ onEdit, onDelete }) {
  return (
    <div className="flex space-x-2 ml-4">
      <button
        onClick={onEdit}
        className="text-blue-400 hover:text-blue-300 p-2 rounded-full hover:bg-gray-600 transition-colors"
        title="Edit review"
      >
        <FaEdit />
      </button>
      <button
        onClick={onDelete}
        className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-gray-600 transition-colors"
        title="Delete review"
      >
        <FaTrash />
      </button>
    </div>
  );
}

export default ReviewsSection;
