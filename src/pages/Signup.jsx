import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// Replaces: index.php (root) + javascript/signup.js + javascript/pass-show-hide.js
const Signup = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [image, setImage] = useState(null); // Replaces: $_FILES['image'] in signup.php
  const [error, setError] = useState("");   // Replaces: errorText div
  const [showPassword, setShowPassword] = useState(false); // Replaces: pass-show-hide.js
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleImageChange = (e) => {
    // Replaces: if(isset($_FILES['image'])) in signup.php
    const file = e.target.files[0];
    if (file) {
      const allowed = ["image/jpeg", "image/jpg", "image/png"];
      // Replaces: in_array($img_type, $types) check in signup.php
      if (!allowed.includes(file.type)) {
        setError("Please upload an image file - jpeg, png, jpg");
        return;
      }
      setImage(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Replaces: form.onsubmit = (e) => { e.preventDefault(); }
    setLoading(true);
    setError("");

    // Replaces: FormData + move_uploaded_file in signup.php
    // multipart/form-data for image upload to Cloudinary via backend
    const data = new FormData();
    data.append("firstName", formData.firstName);
    data.append("lastName", formData.lastName);
    data.append("email", formData.email);
    data.append("password", formData.password);
    if (image) data.append("image", image);

    try {
      // Replaces: xhr.open("POST", "php/signup.php", true) in signup.js
      const { data: responseData } = await api.post("/api/auth/signup", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Replaces: if(data === "success") { location.href = "users.php"; }
      login(responseData);
      navigate("/users");
    } catch (err) {
      // Replaces: errorText.style.display = "block"; errorText.textContent = data;
      setError(err.response?.data?.message || "Something went wrong. Please try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrapper">
      <section className="form signup">
        <header>Signup</header>
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          {error && <div className="error-text">{error}</div>}

          {/* Replaces: .name-details with fname and lname fields */}
          <div className="name-details">
            <div className="field input">
              <input
                type="text"
                name="firstName"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="field input">
              <input
                type="text"
                name="lastName"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="field input">
            <input
              type="text"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field input">
            {/* Replaces: pass-show-hide.js */}
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter new password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <i
              className={`fas fa-eye ${showPassword ? "active" : ""}`}
              onClick={() => setShowPassword(!showPassword)}
            />
          </div>

          {/* Replaces: <div class="field image"> with $_FILES['image'] in signup.php */}
          <div className="field image">
            <label>Upload profile</label>
            <input
              type="file"
              name="image"
              accept="image/x-png,image/gif,image/jpeg,image/jpg"
              onChange={handleImageChange}
              required
            />
          </div>

          <div className="field button">
            {/* Replaces: continueBtn.onclick in signup.js */}
            <input
              type="submit"
              value={loading ? "Creating account..." : "Signup"}
              disabled={loading}
            />
          </div>
        </form>

        {/* Replaces: <div class="link"> in index.php */}
        <div className="link">
          Already have an account? <Link to="/login">Login now</Link>
        </div>
      </section>
    </div>
  );
};

export default Signup;
