import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

const AdminRoute = () => {
  const { userInfo } = useSelector((state) => state.user);

  // Check if user is logged in and is an admin
  // Based on userController, login returns { token, user: {id, name, email, role} }
  // And userSlice sets action.payload to userInfo. So userInfo has token and user.
  // However, localStorage might store a flatter structure.
  // The provided localStorage data is flat: { email, id, name, role, token }
  if (userInfo && (userInfo.user?.role === 'admin' || userInfo.role === 'admin')) {
    return <Outlet />; // Render the nested admin routes
  } else if (userInfo) {
    // User is logged in but not an admin
    // Redirect to home page or a 'not authorized' page
    // For now, redirecting to home page
    return <Navigate to="/" replace />;
  } else {
    // User is not logged in
    // Redirect to login page, saving the intended location to redirect back after login
    return <Navigate to="/login" replace />;
    // Consider: return <Navigate to="/login" state={{ from: location }} replace />
    // if you want to redirect back to admin page after login.
    // This requires `useLocation` from 'react-router-dom'.
  }
};

export default AdminRoute;
