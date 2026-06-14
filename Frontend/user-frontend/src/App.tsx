import React, { useState, useEffect } from "react";
import NotificationManager from "./pages/NotificationManager";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [users, setUsers] = useState<any[]>([]);

  // Login
  const [studentCode, setstudentCode] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // User
  const [formData, setFormData] = useState({
    id: null,
    fullName: "",
    studentCode: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentCode, password }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        localStorage.setItem("token", data.token);
      } else {
        setLoginError("Login failed. Please check credentials.");
      }
    } catch (err) {
      setLoginError("Network error.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentCode,
          password,
          fullName: studentCode.split("@")[0],
          email: "NEW@email.com",
        }),
      });
      if (res.ok) {
        alert("Register successful. You can now login.");
      } else {
        const errText = await res.text();
        setLoginError("Register failed: " + errText);
      }
    } catch (err) {
      setLoginError("Network error.");
    }
  };

  const handleLogout = () => {
    setToken("");
    localStorage.removeItem("token");
    setUsers([]);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isUpdate = formData.id !== null;
      const url = isUpdate ? `/api/users/${formData.id}` : "/api/users";
      const method = isUpdate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchUsers();
        setFormData({
          id: null,
          fullName: "",
          studentCode: "",
          email: "",
          password: "",
        });
      } else {
        alert("Save user failed");
      }
    } catch (err) {
      alert("Network error");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditClick = (user: any) => {
    setFormData({ ...user, password: "" });
  };

  if (!token) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Login / Register</h1>
        {loginError && <p style={{ color: "red" }}>{loginError}</p>}
        <form>
          <div style={{ marginBottom: 10 }}>
            <label>studentCode: </label>
            <input
              type="studentCode"
              value={studentCode}
              onChange={(e) => setstudentCode(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Password: </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" onClick={handleLogin}>
            Login
          </button>
          <button
            type="button"
            onClick={handleRegister}
            style={{ marginLeft: 10 }}
          >
            Register (Quick)
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>User Management</h1>
        <button onClick={handleLogout} style={{ height: 30, marginTop: 25 }}>
          Logout
        </button>
      </div>

      <div style={{ border: "1px solid black", padding: 10, marginBottom: 20 }}>
        <h3>{formData.id ? "Edit User" : "Add New User (Admin form)"}</h3>
        <form onSubmit={handleSaveUser}>
          <div style={{ marginBottom: 5 }}>
            <label>Full Name: </label>
            <input
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              required
            />
          </div>
          <div style={{ marginBottom: 5 }}>
            <label>Student Code: </label>
            <input
              value={formData.studentCode}
              onChange={(e) =>
                setFormData({ ...formData, studentCode: e.target.value })
              }
              required
            />
          </div>
          <div style={{ marginBottom: 5 }}>
            <label>Password: </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
            {formData.id && <small> (Leave blank to keep unchanged)</small>}
          </div>
          <button type="submit">Save</button>
          {formData.id && (
            <button
              type="button"
              onClick={() =>
                setFormData({
                  id: null,
                  fullName: "",
                  studentCode: "",
                  email: "",
                  password: "",
                })
              }
              style={{ marginLeft: 10 }}
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      <table
        border={1}
        cellPadding={5}
        style={{ borderCollapse: "collapse", width: "100%" }}
      >
        <thead>
          <tr>
            <th>ID</th>
            <th>Full Name</th>
            <th>Student Code</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.fullName}</td>
              <td>{u.studentCode}</td>
              <td>{u.role}</td>
              <td>
                <button onClick={() => handleEditClick(u)}>Edit</button>
                <button
                  onClick={() => handleDeleteUser(u.id)}
                  style={{ marginLeft: 5 }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <NotificationManager token={token} onUnauthorized={handleLogout} />
    </div>
  );
}

export default App;
