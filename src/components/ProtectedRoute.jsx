import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Step 1: Still checking if user is logged in → show loading
  if (loading) {
    return (
      <div
        className="wrapper"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "200px",
        }}
      >
        <p>Loading...</p>
      </div>
    );
  }

  // Step 2: No user found → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Step 3: User is logged in → show the actual page
  return children;
};

export default ProtectedRoute;