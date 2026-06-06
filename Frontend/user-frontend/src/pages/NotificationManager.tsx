import { useEffect, useMemo, useState } from "react";
import type {
  NotificationCategory,
  NotificationFormData,
  NotificationItem,
} from "../models/notification.model";

type NotificationManagerProps = {
  token: string;
  onUnauthorized: () => void;
};

type ViewMode = "all" | "active" | "category" | "deadlines";

const categories: NotificationCategory[] = [
  "GENERAL",
  "CONDUCT_SCORE",
  "STUDENT_AFFAIRS",
  "ACADEMIC",
  "SCHOLARSHIP",
  "EVENT",
];

const emptyForm: NotificationFormData = {
  title: "",
  content: "",
  category: "GENERAL",
  location: "",
  actionUrl: "",
  pinned: false,
  active: true,
  startAt: "",
  endAt: "",
  deadlineAt: "",
};

const toDateTimeInputValue = (value?: string) => {
  if (!value) return "";
  return value.slice(0, 16);
};

const toApiDateTime = (value?: string) => {
  if (!value) return undefined;
  return value.length === 16 ? `${value}:00` : value;
};

const NotificationManager = ({
  token,
  onUnauthorized,
}: NotificationManagerProps) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [formData, setFormData] = useState<NotificationFormData>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [selectedCategory, setSelectedCategory] =
    useState<NotificationCategory>("GENERAL");
  const [searchId, setSearchId] = useState("");
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token],
  );

  const handleResponse = async <T,>(res: Response): Promise<T | null> => {
    if (res.status === 401) {
      onUnauthorized();
      return null;
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || "Request failed");
    }

    if (res.status === 204) {
      return null;
    }

    return (await res.json()) as T;
  };

  const getListUrl = () => {
    if (viewMode === "active") return "/api/notifications/active";
    if (viewMode === "deadlines") return "/api/notifications/deadlines";
    if (viewMode === "category") {
      return `/api/notifications/category/${selectedCategory}`;
    }
    return "/api/notifications";
  };

  const fetchNotifications = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(getListUrl(), {
        headers: authHeaders,
      });
      const data = await handleResponse<NotificationItem[]>(res);

      if (data) {
        setNotifications(data);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Cannot load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [viewMode, selectedCategory, token]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const buildPayload = () => ({
    ...formData,
    location: formData.location || undefined,
    actionUrl: formData.actionUrl || undefined,
    startAt: toApiDateTime(formData.startAt),
    endAt: toApiDateTime(formData.endAt),
    deadlineAt: toApiDateTime(formData.deadlineAt),
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    const isUpdate = editingId !== null;
    const url = isUpdate
      ? `/api/notifications/${editingId}`
      : "/api/notifications";

    try {
      const res = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload()),
      });

      await handleResponse<NotificationItem>(res);
      setMessage(isUpdate ? "Notification updated" : "Notification created");
      resetForm();
      fetchNotifications();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Cannot save data");
    }
  };

  const handleEdit = (notification: NotificationItem) => {
    setEditingId(notification.id);
    setFormData({
      title: notification.title,
      content: notification.content,
      category: notification.category,
      location: notification.location || "",
      actionUrl: notification.actionUrl || "",
      pinned: notification.pinned,
      active: notification.active,
      startAt: toDateTimeInputValue(notification.startAt),
      endAt: toDateTimeInputValue(notification.endAt),
      deadlineAt: toDateTimeInputValue(notification.deadlineAt),
    });
  };

  const handleFindById = async () => {
    if (!searchId.trim()) return;

    setMessage("");
    setSelectedNotification(null);

    try {
      const res = await fetch(`/api/notifications/${searchId}`, {
        headers: authHeaders,
      });
      const data = await handleResponse<NotificationItem>(res);

      if (data) {
        setSelectedNotification(data);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Cannot find item");
    }
  };

  const handleSetActive = async (id: number, active: boolean) => {
    setMessage("");

    try {
      const res = await fetch(`/api/notifications/${id}/active?active=${active}`, {
        method: "PUT",
        headers: authHeaders,
      });

      await handleResponse<NotificationItem>(res);
      fetchNotifications();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Cannot update status");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this notification?")) return;

    setMessage("");

    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      await handleResponse(res);
      fetchNotifications();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Cannot delete item");
    }
  };

  return (
    <section style={{ marginTop: 32 }}>
      <h2>Notification Service</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={() => setViewMode("all")}>
          All
        </button>
        <button type="button" onClick={() => setViewMode("active")}>
          Active
        </button>
        <button type="button" onClick={() => setViewMode("deadlines")}>
          Deadlines
        </button>
        <select
          value={selectedCategory}
          onChange={(e) =>
            setSelectedCategory(e.target.value as NotificationCategory)
          }
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setViewMode("category")}>
          Filter category
        </button>
        <button type="button" onClick={fetchNotifications}>
          Refresh
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Notification ID"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
        />
        <button type="button" onClick={handleFindById}>
          Find by ID
        </button>
        {selectedNotification && (
          <span>
            #{selectedNotification.id} - {selectedNotification.title}
          </span>
        )}
      </div>

      {message && <p>{message}</p>}
      {loading && <p>Loading notifications...</p>}

      <form
        onSubmit={handleSave}
        style={{ border: "1px solid black", padding: 10, marginBottom: 20 }}
      >
        <h3>{editingId ? "Edit Notification" : "Create Notification"}</h3>

        <div style={{ marginBottom: 5 }}>
          <label>Title: </label>
          <input
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
          />
        </div>

        <div style={{ marginBottom: 5 }}>
          <label>Content: </label>
          <textarea
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            required
          />
        </div>

        <div style={{ marginBottom: 5 }}>
          <label>Category: </label>
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({
                ...formData,
                category: e.target.value as NotificationCategory,
              })
            }
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 5 }}>
          <label>Location: </label>
          <input
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
          />
        </div>

        <div style={{ marginBottom: 5 }}>
          <label>Action URL: </label>
          <input
            value={formData.actionUrl}
            onChange={(e) =>
              setFormData({ ...formData, actionUrl: e.target.value })
            }
          />
        </div>

        <div style={{ marginBottom: 5 }}>
          <label>Start: </label>
          <input
            type="datetime-local"
            value={formData.startAt}
            onChange={(e) =>
              setFormData({ ...formData, startAt: e.target.value })
            }
          />
        </div>

        <div style={{ marginBottom: 5 }}>
          <label>End: </label>
          <input
            type="datetime-local"
            value={formData.endAt}
            onChange={(e) =>
              setFormData({ ...formData, endAt: e.target.value })
            }
          />
        </div>

        <div style={{ marginBottom: 5 }}>
          <label>Deadline: </label>
          <input
            type="datetime-local"
            value={formData.deadlineAt}
            onChange={(e) =>
              setFormData({ ...formData, deadlineAt: e.target.value })
            }
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>
            <input
              type="checkbox"
              checked={formData.pinned}
              onChange={(e) =>
                setFormData({ ...formData, pinned: e.target.checked })
              }
            />
            Pinned
          </label>
          <label style={{ marginLeft: 12 }}>
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) =>
                setFormData({ ...formData, active: e.target.checked })
              }
            />
            Active
          </label>
        </div>

        <button type="submit">Save notification</button>
        {editingId && (
          <button type="button" onClick={resetForm} style={{ marginLeft: 8 }}>
            Cancel
          </button>
        )}
      </form>

      <table
        border={1}
        cellPadding={5}
        style={{ borderCollapse: "collapse", width: "100%" }}
      >
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Category</th>
            <th>Active</th>
            <th>Pinned</th>
            <th>Deadline</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {notifications.map((notification) => (
            <tr key={notification.id}>
              <td>{notification.id}</td>
              <td>{notification.title}</td>
              <td>{notification.category}</td>
              <td>{notification.active ? "Yes" : "No"}</td>
              <td>{notification.pinned ? "Yes" : "No"}</td>
              <td>{notification.deadlineAt || "-"}</td>
              <td>
                <button type="button" onClick={() => handleEdit(notification)}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSetActive(notification.id, !notification.active)
                  }
                  style={{ marginLeft: 5 }}
                >
                  {notification.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(notification.id)}
                  style={{ marginLeft: 5 }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default NotificationManager;
