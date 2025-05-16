import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import CategoryForm from '../components/CategoryForm';
import api from '../../services/api';

const CategoryFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategory = async () => {
      if (id) {
        try {
          setLoading(true);
          const response = await api.get(`/categories/${id}`);
          setCategory(response.data.category);
          setError(null);
        } catch (err) {
          setError(err.response?.data?.message || err.message || 'Failed to fetch category');
          console.error("Error fetching category:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setCategory(null);
        setLoading(false);
      }
    };

    fetchCategory();
  }, [id]);

  const handleSaveCategory = async (formData) => {
    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };

      if (id) {
        // Update category
        await api.put(`/categories/${id}`, formData, config);
      } else {
        // Create category
        await api.post('/categories', formData, config);
      }
      navigate('/admin/categories'); // Redirect to the admin categories page after submission
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.message || 'Failed to save category');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><p className="text-xl">Loading category...</p></div>;
  }

  if (error) {
    return <div className="text-red-500 p-4 bg-red-100 rounded-md">Error: {error}</div>;
  }

  return (
    <div>
      <CategoryForm category={category} onSave={handleSaveCategory} />
    </div>
  );
};

export default CategoryFormPage;
