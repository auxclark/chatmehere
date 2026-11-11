import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { ArrowLeft, Save, User as UserIcon, Mail, Image as ImageIcon, Activity } from "lucide-react";

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    avatar: user?.avatar || user?.profileImage || "",
    status: user?.status || "Active now",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const fileInputRef = useRef(null);

  const handleChange = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const { data } = await api.put("/api/users/profile", form);
      updateUser(data);
      setMessage("Profile updated successfully.");
    } catch (err) {
      console.error("profile update error", err);
      setMessage(err?.response?.data?.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await api.put("/api/auth/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateUser(data);
      setForm((prev) => ({ ...prev, avatar: data.avatar }));
      setMessage("Profile picture updated.");
    } catch (err) {
      console.error("avatar upload error", err);
      setMessage(err?.response?.data?.message || "Could not upload image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f3f7", fontFamily: "Poppins, sans-serif" }}>
      <nav style={{
        background: "linear-gradient(135deg, #89253E 0%, #5a2d5a 45%, #3A6186 100%)",
        boxShadow: "0 2px 20px rgba(137,37,62,0.35)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", height: 56, padding: "0 20px", gap: 12 }}>
          <button
            onClick={() => navigate("/feed")}
            style={{
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 10, color: "#fff", cursor: "pointer",
              padding: "7px 12px", display: "flex", alignItems: "center", gap: 6,
              fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 600,
            }}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 17, letterSpacing: "-0.4px" }}>
            My Profile
          </span>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: "24px auto", padding: "0 20px" }}>
        <div style={{
          background: "#fff", borderRadius: 16, padding: 24,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(137,37,62,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "linear-gradient(135deg, #89253E, #3A6186)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", color: "#fff", fontWeight: 700, fontSize: 24,
            }}>
              {form.avatar ? (
                <img src={form.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                (form.firstName?.[0] || "") + (form.lastName?.[0] || "")
              )}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#111827" }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{user?.email}</div>
              <div style={{ marginTop: 8 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    background: "rgba(137,37,62,0.08)", color: "#89253E",
                    border: "1px solid rgba(137,37,62,0.2)", borderRadius: 8,
                    padding: "6px 12px", fontSize: 12, fontWeight: 600,
                    cursor: uploading ? "not-allowed" : "pointer",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  {uploading ? "Uploading..." : "Upload photo"}
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                <UserIcon size={13} /> First name
              </span>
              <input
                value={form.firstName}
                onChange={handleChange("firstName")}
                required
                style={{
                  height: 42, padding: "0 14px", borderRadius: 10,
                  border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none",
                  fontFamily: "Poppins, sans-serif",
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                <UserIcon size={13} /> Last name
              </span>
              <input
                value={form.lastName}
                onChange={handleChange("lastName")}
                required
                style={{
                  height: 42, padding: "0 14px", borderRadius: 10,
                  border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none",
                  fontFamily: "Poppins, sans-serif",
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                <ImageIcon size={13} /> Avatar URL
              </span>
              <input
                value={form.avatar}
                onChange={handleChange("avatar")}
                placeholder="https://..."
                style={{
                  height: 42, padding: "0 14px", borderRadius: 10,
                  border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none",
                  fontFamily: "Poppins, sans-serif",
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                <Activity size={13} /> Status
              </span>
              <input
                value={form.status}
                onChange={handleChange("status")}
                placeholder="Active now"
                style={{
                  height: 42, padding: "0 14px", borderRadius: 10,
                  border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none",
                  fontFamily: "Poppins, sans-serif",
                }}
              />
            </label>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: "linear-gradient(135deg, #89253E, #3A6186)", color: "#fff",
                  border: "none", borderRadius: 10, padding: "10px 18px",
                  fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "Poppins, sans-serif", display: "flex", alignItems: "center", gap: 8,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <Save size={14} /> {saving ? "Saving..." : "Save changes"}
              </button>
              {message && (
                <span style={{ fontSize: 13, color: message.includes("success") ? "#16a34a" : "#dc2626" }}>
                  {message}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
