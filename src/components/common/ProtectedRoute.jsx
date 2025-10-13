// ProtectedRoute.jsx
import { useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  
  // Allow OAuth callback with code to pass through
  if (code) {
    return children;
  }
  
  const token = localStorage.getItem('bearerToken');
  
  if (!token) {
    window.location.href = import.meta.env.VITE_PANGEA_AUTH_URL;
    return null;
  }
  
  return children;
};

export default ProtectedRoute;