import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaSearch,
  FaFileExport,
  FaEdit,
  FaTrash,
  FaTimes,
  FaCalendarAlt,
  FaEye,
  FaStore,
  FaTag,
  FaCoins,
  FaUsers,
  FaChartBar,
  FaImage,
  FaUpload,
  FaCamera
} from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";

const PAGE_SIZE = 10;
const API_BASE_URL = "https://api.redemly.com/api/vendor";
const ADMIN_API_BASE_URL = "https://api.redemly.com/api/admin";

const VendorCoupons = () => {
  const vendorId = localStorage.getItem("vendorId");

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);

  // View Modal States
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);

  // Edit Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    discountPercentage: "",
    requiredCoins: "",
    limitForSameUser: "",
    maxUsage: "",
    validityDate: "",
    couponCodeType: "%",
  });

  // Image Upload States
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const [categories, setCategories] = useState([]);

  /* ---------------- FETCH CATEGORIES ---------------- */
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(
          "https://api.redemly.com/api/admin/categories"
        );

        setCategories(res.data?.categories || []);
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
    };

    fetchCategories();
  }, []);

  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ================= FETCH COUPONS =================
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/${vendorId}/coupons`);
      console.log("Coupons response:", res.data);
      setCoupons(res.data.coupons || []);
    } catch (err) {
      console.error("Fetch coupons error:", err);
      alert("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [vendorId]);

  // ================= VIEW COUPON DETAILS =================
  const openViewModal = (coupon) => {
    setSelectedCoupon(coupon);
    setViewModalOpen(true);
  };

  // ================= EDIT COUPON =================
  const openEditModal = (coupon) => {
    setCurrentCoupon(coupon);
    setEditForm({
      name: coupon.name || "",
      category: coupon.category || "",
      discountPercentage: coupon.discountPercentage || "",
      requiredCoins: coupon.requiredCoins || "",
      limitForSameUser: coupon.limitForSameUser || "",
      maxUsage: coupon.maxUsage || "",
      validityDate: coupon.validityDate
        ? new Date(coupon.validityDate).toISOString().split("T")[0]
        : "",
      couponCodeType: coupon.couponCodeType || "%",
    });
    setSelectedImage(null);
    setImagePreview(coupon.couponImage || null);
    setEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm({ ...editForm, [name]: value });
  };

  // ================= IMAGE UPLOAD HANDLERS =================
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert("Please select a valid image file (JPG, PNG, GIF, WebP)");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }
      setSelectedImage(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleImageUpload = async () => {
    if (!currentCoupon?._id || !selectedImage) return;

    setImageUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('couponImage', selectedImage);

      const res = await axios.put(
        `${API_BASE_URL}/update-coupon-image/${currentCoupon._id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (res.data.success || res.data.message || res.data.coupon) {
        // Update local state with new image URL
        const newImageUrl = res.data.coupon?.couponImage || res.data.imageUrl;
        
        setCoupons((prev) =>
          prev.map((c) =>
            c._id === currentCoupon._id
              ? { ...c, couponImage: newImageUrl }
              : c
          )
        );
        
        // Update currentCoupon state as well
        setCurrentCoupon(prev => prev ? { ...prev, couponImage: newImageUrl } : null);
        
        // Update selectedCoupon if it's the same coupon being viewed
        if (selectedCoupon?._id === currentCoupon._id) {
          setSelectedCoupon(prev => prev ? { ...prev, couponImage: newImageUrl } : null);
        }
        
        setSelectedImage(null);
        // Reset file input
        const fileInput = document.getElementById('coupon-image-input');
        if (fileInput) fileInput.value = '';
        alert("Coupon image updated successfully! ✅");
      } else {
        alert("Failed to update coupon image.");
      }
    } catch (error) {
      console.error("Failed to upload coupon image:", error);
      alert(error.response?.data?.message || "Error uploading image.");
    } finally {
      setImageUploadLoading(false);
    }
  };

  const handleUpdateCoupon = async () => {
    if (!currentCoupon?._id) return;

    if (!editForm.name || !editForm.discountPercentage || !editForm.validityDate) {
      alert("Name, discount and validity date are required");
      return;
    }

    setEditLoading(true);
    try {
      const response = await axios.put(
        `${API_BASE_URL}/update-coupon/${currentCoupon._id}`,
        editForm,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.success || response.data.message) {
        alert("Coupon updated successfully ✅");
        fetchCoupons();
        setEditModalOpen(false);
      }
    } catch (err) {
      console.error("Update coupon error:", err);
      alert(err.response?.data?.message || "Failed to update coupon");
    } finally {
      setEditLoading(false);
    }
  };

  // ================= DELETE COUPON =================
  const openDeleteModal = (coupon) => {
    setCouponToDelete(coupon);
    setDeleteModalOpen(true);
  };

  const handleDeleteCoupon = async () => {
    if (!couponToDelete?._id) return;

    setDeleteLoading(true);
    try {
      // Use the admin API endpoint
      const response = await axios.delete(
        `https://api.redemly.com/api/vendor/coupon/${couponToDelete._id}`
      );

      console.log("Delete response:", response.data);

      if (response.data.success || response.data.message) {
        alert("Coupon deleted successfully ✅");
        fetchCoupons();
        setDeleteModalOpen(false);
      }
    } catch (err) {
      console.error("Delete coupon error:", err);
      alert(err.response?.data?.message || "Failed to delete coupon");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ================= FILTER LOGIC =================
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const matchesSearch =
        (c.name?.toLowerCase().includes(search.toLowerCase()) ||
          c.category?.toLowerCase().includes(search.toLowerCase()) ||
          c.couponCode?.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" || c.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all" || c.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [coupons, search, statusFilter, categoryFilter]);

  const totalPages = Math.ceil(filteredCoupons.length / PAGE_SIZE);
  const paginatedCoupons = filteredCoupons.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // ================= EXPORT CSV =================
  const exportCSV = () => {
    const headers = [
      "Name",
      "Category",
      "Discount %",
      "Code",
      "Status",
      "Required Coins",
      "Usage",
      "Validity",
      "Created"
    ];

    const rows = filteredCoupons.map((c) => [
      c.name,
      c.category,
      c.discountPercentage,
      c.couponCode,
      c.status,
      c.requiredCoins,
      `${c.usedCount}/${c.maxUsage}`,
      new Date(c.validityDate).toLocaleDateString(),
      new Date(c.createdAt).toLocaleDateString(),
    ]);

    const csv = headers.join(",") + "\n" + rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "vendor-coupons.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status) => {
    const map = {
      approved: "bg-green-100 text-green-800 border border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      rejected: "bg-red-100 text-red-800 border border-red-200",
      expired: "bg-gray-200 text-gray-800 border border-gray-300",
      used: "bg-purple-100 text-purple-800 border border-purple-200",
      deleted: "bg-gray-100 text-gray-500 border border-gray-200",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${map[status] || "bg-gray-100"
          }`}
      >
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  // ================= RENDER LOADING =================
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600 font-medium">Loading coupons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Coupons</h1>
          <p className="text-gray-600 text-sm">
            Manage and track your created coupons
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={fetchCoupons}
            className="flex items-center gap-2 bg-white text-blue-700 border border-blue-300 px-4 py-2 rounded-xl shadow-sm hover:bg-blue-50 transition-colors"
          >
            <FiRefreshCw />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl shadow hover:opacity-90 transition-all"
          >
            <FaFileExport />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto bg-white/90 backdrop-blur rounded-2xl p-4 shadow-lg border border-blue-100 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, category or code..."
            className="pl-10 pr-4 py-2.5 w-full border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          className="border border-blue-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          className="border border-blue-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Categories</option>
          {[...new Set(coupons.map((c) => c.category))].map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <div className="text-sm text-gray-600 flex items-center">
          <span className="font-medium">{filteredCoupons.length}</span>
          <span className="ml-1">coupons found</span>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
              <tr>
                <th className="p-4 text-left text-sm font-semibold text-blue-900">#</th>
                <th className="p-4 text-left text-sm font-semibold text-blue-900">Coupon Name</th>
                <th className="p-4 text-left text-sm font-semibold text-blue-900">Category</th>
                <th className="p-4 text-left text-sm font-semibold text-blue-900">Discount</th>
                <th className="p-4 text-left text-sm font-semibold text-blue-900">Code</th>
                <th className="p-4 text-left text-sm font-semibold text-blue-900">Status</th>
                <th className="p-4 text-left text-sm font-semibold text-blue-900">Usage</th>
                <th className="p-4 text-left text-sm font-semibold text-blue-900">Validity</th>
                <th className="p-4 text-left text-sm font-semibold text-blue-900">Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedCoupons.map((c, index) => (
                <tr key={c._id} className="border-t border-blue-50 hover:bg-blue-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-mono text-sm text-gray-500">
                      #{index + 1 + (page - 1) * PAGE_SIZE}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {c.couponImage && (
                        <img
                          src={c.couponImage}
                          alt={c.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.vendorId?.businessName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {c.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-blue-700">{c.discountPercentage}%</div>
                    <div className="text-xs text-gray-500">{c.couponCodeType}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-mono text-sm bg-gray-50 rounded px-2 py-1">
                      {c.couponCode}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Coins: {c.requiredCoins}</div>
                  </td>
                  <td className="p-4">{statusBadge(c.status)}</td>
                  <td className="p-4">
                    <div className="text-sm">
                      <div className="font-medium">{c.usedCount}/{c.maxUsage}</div>
                      <div className="text-xs text-gray-500">Limit: {c.limitForSameUser}/user</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt className="text-blue-500 text-sm" />
                      <span className="text-sm">
                        {new Date(c.validityDate).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openViewModal(c)}
                        className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => openEditModal(c)}
                        disabled={c.status === "deleted" || c.status === "rejected"}
                        className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Edit Coupon"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => openDeleteModal(c)}
                        disabled={c.status === "deleted"}
                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Delete Coupon"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {paginatedCoupons.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-5xl mb-4">🎫</div>
              <p className="text-gray-500 text-lg">No coupons found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-5 py-2.5 rounded-xl bg-white border border-blue-300 text-blue-700 font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="font-medium text-gray-700">
            Page <span className="text-blue-700">{page}</span> of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-5 py-2.5 rounded-xl bg-white border border-blue-300 text-blue-700 font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* View Coupon Details Modal */}
      {viewModalOpen && selectedCoupon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-blue-100">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Coupon Details</h3>
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Header with Image */}
              <div className="flex items-start gap-4 mb-6">
                {selectedCoupon.couponImage ? (
                  <img
                    src={selectedCoupon.couponImage}
                    alt={selectedCoupon.name}
                    className="w-24 h-24 rounded-xl object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                    <FaImage className="text-2xl" />
                  </div>
                )}
                <div>
                  <h4 className="text-2xl font-bold text-gray-900">{selectedCoupon.name}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    {statusBadge(selectedCoupon.status)}
                    <span className="text-sm text-gray-600">{selectedCoupon.category}</span>
                  </div>
                  <div className="mt-2">
                    <div className="font-mono text-lg bg-gray-100 px-3 py-1 rounded-lg inline-block">
                      {selectedCoupon.couponCode}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FaTag className="text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Discount</div>
                        <div className="text-2xl font-bold text-blue-700">
                          {selectedCoupon.discountPercentage}%
                        </div>
                        <div className="text-xs text-gray-500">Type: {selectedCoupon.couponCodeType}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <FaCoins className="text-purple-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Required Coins</div>
                        <div className="text-2xl font-bold text-purple-700">
                          {selectedCoupon.requiredCoins}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <FaUsers className="text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Usage Limits</div>
                        <div className="font-medium text-gray-900">
                          {selectedCoupon.usedCount} / {selectedCoupon.maxUsage} used
                        </div>
                        <div className="text-xs text-gray-500">
                          {selectedCoupon.limitForSameUser} per user
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="bg-yellow-50 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <FaCalendarAlt className="text-yellow-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Validity</div>
                        <div className="font-medium text-gray-900">
                          {new Date(selectedCoupon.validityDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <FaStore className="text-gray-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Vendor</div>
                        <div className="font-medium text-gray-900">
                          {selectedCoupon.vendorId?.businessName}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {selectedCoupon.vendorId?._id}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <FaChartBar className="text-indigo-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Created & Updated</div>
                        <div className="text-xs text-gray-500">
                          Created: {new Date(selectedCoupon.createdAt).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          Updated: {new Date(selectedCoupon.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-blue-100 flex justify-end">
              <button
                onClick={() => setViewModalOpen(false)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Coupon Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-blue-100">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Edit Coupon</h3>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <FaTimes />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">Edit coupon details</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Coupon Image Upload Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <FaImage /> Coupon Image
                </label>
                <div className="flex flex-col gap-3">
                  {/* Image Preview */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Coupon preview"
                          className="w-20 h-20 rounded-xl object-cover border-2 border-blue-200"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                          <FaCamera className="text-xl" />
                        </div>
                      )}
                      {imagePreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setSelectedImage(null);
                            const fileInput = document.getElementById('coupon-image-input');
                            if (fileInput) fileInput.value = '';
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow"
                          title="Remove image"
                        >
                          <FaTimes className="text-xs" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        id="coupon-image-input"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="coupon-image-input"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <FaUpload />
                        {selectedImage ? selectedImage.name : "Choose Image"}
                      </label>
                      <p className="text-xs text-gray-400 mt-1">
                        Max 5MB • JPG, PNG, GIF, WebP
                      </p>
                    </div>
                  </div>
                  
                  {/* Upload Button */}
                  {selectedImage && (
                    <button
                      onClick={handleImageUpload}
                      disabled={imageUploadLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <FaUpload />
                      {imageUploadLoading ? "Uploading..." : "Upload Image"}
                    </button>
                  )}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coupon Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter coupon name"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>

                <select
                  name="category"
                  value={editForm.category}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="" disabled>Select Category</option>

                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.categoryName}>
                      {cat.categoryName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Discount Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Percentage
                </label>
                <input
                  type="number"
                  name="discountPercentage"
                  value={editForm.discountPercentage}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter discount percentage"
                  min="1"
                  max="100"
                />
              </div>

              {/* Required Coins */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required Coins
                </label>
                <input
                  type="number"
                  name="requiredCoins"
                  value={editForm.requiredCoins}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter required coins"
                  min="0"
                />
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Limit
                  </label>
                  <input
                    type="number"
                    name="limitForSameUser"
                    value={editForm.limitForSameUser}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Per user"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Usage
                  </label>
                  <input
                    type="number"
                    name="maxUsage"
                    value={editForm.maxUsage}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Total usage"
                    min="1"
                  />
                </div>
              </div>

              {/* Validity Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validity Date
                </label>
                <input
                  type="date"
                  name="validityDate"
                  value={editForm.validityDate}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Coupon Code Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coupon Type
                </label>
                <select
                  name="couponCodeType"
                  value={editForm.couponCodeType}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="%">Percentage (%)</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-blue-100 flex justify-end gap-3">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCoupon}
                disabled={editLoading}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-red-100">
              <h3 className="text-xl font-bold text-gray-900">Delete Coupon</h3>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                  <FaTrash className="text-red-500 text-xl" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {couponToDelete?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Code: {couponToDelete?.couponCode}
                  </p>
                  <p className="text-sm text-gray-500">
                    Category: {couponToDelete?.category}
                  </p>
                </div>
              </div>

              <p className="text-gray-600 mb-6">
                This coupon will be deleted permanently. Are you sure you want to continue?
              </p>
            </div>

            <div className="p-6 border-t border-red-100 flex justify-end gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCoupon}
                disabled={deleteLoading}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {deleteLoading ? "Deleting..." : "Delete Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorCoupons;