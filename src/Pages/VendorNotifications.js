import React, { useEffect, useState } from "react";
import {
  MdNotificationsActive,
  MdDelete,
  MdDownloadDone,
  MdError,
  MdDoneAll,
} from "react-icons/md";
import { FaTag, FaCheckCircle, FaClock } from "react-icons/fa";

const iconMap = {
  coupon: <FaTag className="text-blue-600" />,
  coupon_approved: <FaCheckCircle className="text-green-600" />,
  coupon_approved_user: <FaCheckCircle className="text-green-700" />,
  coupon_download: <MdDownloadDone className="text-purple-600" />,
  coupon_rejected: <MdError className="text-red-600" />,
  admin_action: <MdNotificationsActive className="text-indigo-600" />,
  default: <MdNotificationsActive className="text-gray-600" />,
};

const LIMIT = 6;

const VendorNotifications = () => {
  const vendorId = localStorage.getItem("vendorId");

  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ total: 0, unread: 0 });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ---------------- FETCH ---------------- */
  const fetchNotifications = async (page = 1) => {
    try {
      setLoading(true);

      const res = await fetch(
        `https://api.redemly.com/api/vendor/notifications/${vendorId}?page=${page}&limit=${LIMIT}`
      );

      if (!res.ok) throw new Error(`Failed with status ${res.status}`);

      const json = await res.json();

      setNotifications(json?.data?.notifications || []);
      setStats(json?.data?.stats || {});
      setPagination({
        page: json?.data?.pagination?.page || 1,
        totalPages: json?.data?.pagination?.totalPages || 1,
      });
    } catch (err) {
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!vendorId) {
      setError("Vendor ID not found");
      setLoading(false);
      return;
    }
    fetchNotifications(1);
  }, [vendorId]);

  /* ---------------- MARK SINGLE READ ---------------- */
  const markAsRead = async (notificationId) => {
    try {
      await fetch(
        `https://api.redemly.com/api/vendor/${vendorId}/notifications/${notificationId}/read`,
        { method: "PUT" }
      );

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );

      setStats((prev) => ({
        ...prev,
        unread: Math.max(prev.unread - 1, 0),
      }));
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  /* ---------------- MARK ALL READ ---------------- */
  const markAllRead = async () => {
    try {
      await fetch(
        `https://api.redemly.com/api/vendor/${vendorId}/notifications/mark-all-read`,
        { method: "PUT" }
      );

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );

      setStats((prev) => ({ ...prev, unread: 0 }));
    } catch (err) {
      alert("Failed to mark all as read");
    }
  };

  /* ---------------- DELETE ---------------- */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this Notification permanently?")) return;
    try {
      const res = await fetch(
        `https://api.redemly.com/api/vendor/${vendorId}/notifications/${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");

      fetchNotifications(pagination.page);
    } catch (err) {
      alert(err.message);
    }
  };

  const changePage = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    fetchNotifications(page);
  };

  if (loading) return <div className="p-6 text-center">Loading…</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MdNotificationsActive className="text-blue-600" />
          Vendor Notifications
        </h1>

        <div className="flex items-center gap-4 text-sm">
          <span>Total: {stats.total}</span>
          <span className="font-semibold text-blue-600">
            Unread: {stats.unread}
          </span>

          {stats.unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <MdDoneAll />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <p className="text-center text-gray-500">No notifications</p>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif._id}
              onClick={() => !notif.isRead && markAsRead(notif._id)}
              className={`flex justify-between items-start p-4 rounded-lg border shadow-sm cursor-pointer transition
                ${notif.isRead
                  ? "bg-white border-gray-100"
                  : "bg-blue-200 border-blue-300 text-black font-medium"
                }`}
            >
              <div className="flex gap-4">
                <div className="text-2xl mt-1">
                  {iconMap[notif.type] || iconMap.default}
                </div>

                <div>
                  <h2 className="font-semibold text-gray-800">
                    {notif.title}
                  </h2>
                  <p className="text-sm text-gray-600">{notif.message}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <FaClock />
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(notif._id);
                }}
                className="text-red-500 hover:text-red-700"
              >
                <MdDelete size={20} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center mt-8 gap-2 flex-wrap items-center">

          {/* Prev */}
          <button
            onClick={() => changePage(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          {/* Page Numbers */}
          {(() => {
            const pages = [];
            const current = pagination.page;
            const total = pagination.totalPages;

            // Always show first page
            pages.push(1);

            // Show dots before middle pages
            if (current > 3) pages.push("start-ellipsis");

            // Middle pages (c-1, c, c+1)
            for (let i = current - 1; i <= current + 1; i++) {
              if (i > 1 && i < total) pages.push(i);
            }

            // Show dots after middle pages
            if (current < total - 2) pages.push("end-ellipsis");

            // Always show last page
            if (total > 1) pages.push(total);

            return pages.map((p, i) =>
              p === "start-ellipsis" || p === "end-ellipsis" ? (
                <span key={i} className="px-2">...</span>
              ) : (
                <button
                  key={i}
                  onClick={() => changePage(p)}
                  className={`px-3 py-1 border rounded ${pagination.page === p
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-100"
                    }`}
                >
                  {p}
                </button>
              )
            );
          })()}

          {/* Next */}
          <button
            onClick={() => changePage(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>

        </div>
      )}
    </div>
  );
};

export default VendorNotifications;
