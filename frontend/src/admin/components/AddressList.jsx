import React, { useState } from 'react';
import api from '../../services/api';
import AddressSelector from '../../components/Address/AddressSelector';

const AddressList = ({ addresses, userId, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [editAddress, setEditAddress] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleEdit = (address) => {
    setEditAddress(address);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditAddress(null);
  };

  const handleSave = async () => {
    if (!editAddress.province?.id || !editAddress.district?.id || !editAddress.ward?.code || !editAddress.street?.trim()) {
      alert('Vui lòng nhập đầy đủ thông tin địa chỉ.');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/users/${userId}/addresses/main`, {
        street: editAddress.street.trim(),
        ward: editAddress.ward,
        district: editAddress.district,
        province: editAddress.province,
        isDefault: true
      });
      alert('Cập nhật địa chỉ thành công.');
      setEditing(false);
      setEditAddress(null);
      onUpdate();
    } catch (error) {
      alert('Lỗi khi cập nhật địa chỉ: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addressId) => {
    if (window.confirm('Bạn có chắc muốn xóa địa chỉ này? Hành động này sẽ xóa trắng thông tin địa chỉ của người dùng.')) {
      try {
        await api.delete(`/users/${userId}/addresses/main`);
        alert('Xóa địa chỉ thành công.');
        onUpdate();
      } catch (error) {
        alert('Lỗi khi xóa địa chỉ: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  if (!addresses || addresses.length === 0) {
    return <p className="text-gray-500">Người dùng này chưa có địa chỉ nào được lưu.</p>;
  }

  return (
    <div className="space-y-4">
      {addresses.map((address, index) => (
        <div key={index} className="p-4 border rounded-lg bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center">
          {editing ? (
            <div className="w-full">
              <AddressSelector
                selectedAddress={editAddress}
                onAddressChange={setEditAddress}
                showDetailedAddress={true}
                required={true}
                theme="light"
              />
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-400 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="font-semibold">{address.street}</p>
                <p className="text-sm text-gray-600">
                  {address.ward?.name}, {address.district?.name}, {address.province?.name}
                </p>
                {address.isDefault && (
                  <span className="mt-2 inline-block bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    Mặc định
                  </span>
                )}
              </div>
              <div className="flex space-x-2 mt-4 md:mt-0">
                <button
                  onClick={() => handleEdit(address)}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(address._id || 'main')}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  Xóa
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default AddressList;
