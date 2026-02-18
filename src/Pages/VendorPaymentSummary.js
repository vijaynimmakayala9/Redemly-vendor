import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaStore,
  FaDollarSign,
  FaCheckCircle,
  FaClock,
  FaReceipt,
  FaSearch,
  FaFileExport,
  FaChevronLeft,
  FaChevronRight,
  FaMoneyBillWave,
  FaCreditCard,
  FaTimes,
  FaUpload,
  FaSpinner,
  FaDownload,
  FaEye,
} from "react-icons/fa";

const API_BASE = "https://api.redemly.com/api";
const LOCAL_API_BASE = "https://api.redemly.com/api";
const PAGE_SIZE = 5;

// Razorpay initialization
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/* ── CSV export helper ── */
function exportCSV(filename, headers, rows) {
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Pagination bar ── */
function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 mt-4 flex-wrap">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
      >
        <FaChevronLeft size={12} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            p === page
              ? "bg-blue-600 text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
      >
        <FaChevronRight size={12} />
      </button>
    </div>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }) {
  const isPaid = status === "paid" || status === "fully_paid" || status === "completed";
  const isPending = status === "pending" || status === "payment_pending";
  const isApprovalPending = status === "approval_pending";
  const isFailed = status === "failed" || status === "rejected";
  
  if (isApprovalPending) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
        Approval Pending
      </span>
    );
  }
  
  if (isFailed) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Failed
      </span>
    );
  }
  
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        isPaid ? "bg-green-100 text-green-700" : 
        isPending ? "bg-yellow-100 text-yellow-700" : 
        "bg-gray-100 text-gray-700"
      }`}
    >
      {status === "fully_paid" ? "Paid" : status}
    </span>
  );
}

/* ── Payment Modal ── */
function PaymentModal({ isOpen, onClose, periodData, vendorId, onPaymentComplete }) {
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [paymentProof, setPaymentProof] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRazorpayScript().then((loaded) => {
        setRazorpayLoaded(loaded);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }
      setPaymentProof(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOfflinePayment = async () => {
    if (!description.trim()) {
      setError("Please provide a description");
      return;
    }
    
    if (!paymentProof) {
      setError("Please upload payment proof");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("periodType", periodData.periodType);
    formData.append("month", periodData.month);
    formData.append("description", description);
    formData.append("paymentProof", paymentProof);

    if (periodData.periodType === "weekly") {
      formData.append("startDate", periodData.startDate);
      formData.append("endDate", periodData.endDate);
    }

    try {
      const response = await axios.post(
        `${LOCAL_API_BASE}/vendor/${vendorId}/payments/request-offline`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setSuccess(response.data);
      setTimeout(() => {
        onPaymentComplete();
        onClose();
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit payment request");
    } finally {
      setLoading(false);
    }
  };

  const handleOnlinePayment = async () => {
    if (!razorpayLoaded) {
      setError("Razorpay failed to load. Please refresh the page.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Step 1: Initiate online payment
      const initiateResponse = await axios.post(
        `${LOCAL_API_BASE}/vendor/${vendorId}/payments/initiate-online`,
        {
          periodType: periodData.periodType,
          month: periodData.month,
        }
      );

      const { orderId, amountINR, currency, keyId, amountUSD, periodLabel } = initiateResponse.data;

      // Step 2: Configure Razorpay options
      const options = {
        key: "rzp_test_BxtRNvflG06PTV", // Fallback to your key
        amount: amountINR * 100, // Amount in paise
        currency: currency || "INR",
        name: "Redemly",
        description: `Payment for ${periodLabel || periodData.periodLabel}`,
        order_id: orderId,
        handler: async (paymentResponse) => {
          try {
            // Step 3: Verify payment
            const verifyResponse = await axios.post(
              `${LOCAL_API_BASE}/vendor/${vendorId}/payments/verify`,
              {
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                month: periodData.month,
                periodType: periodData.periodType,
              }
            );
            
            setSuccess({
              message: "Payment verified successfully!",
              details: verifyResponse.data,
            });
            
            setTimeout(() => {
              onPaymentComplete();
              onClose();
            }, 2000);
          } catch (verifyErr) {
            setError(verifyErr.response?.data?.message || "Payment verification failed");
          }
        },
        prefill: {
          name: "Vendor Name",
          email: "vendor@example.com",
          contact: "9999999999",
        },
        notes: {
          vendorId: vendorId,
          periodType: periodData.periodType,
          month: periodData.month,
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      // Step 4: Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', (response) => {
        setError(response.error.description || "Payment failed");
        setLoading(false);
      });

      razorpay.open();
      
    } catch (err) {
      setError(err.response?.data?.message || "Failed to initiate online payment");
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (paymentMethod === "offline") {
      handleOfflinePayment();
    } else {
      handleOnlinePayment();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-blue-900">Make Payment</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <FaTimes />
            </button>
          </div>

          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-green-500 text-3xl" />
              </div>
              <h4 className="text-lg font-semibold text-green-700 mb-2">Success!</h4>
              <p className="text-gray-600 mb-4">{success.message}</p>
              {success.details?.approval && (
                <div className="bg-gray-50 p-4 rounded-lg text-left text-sm">
                  <p className="mb-1"><strong>Approval ID:</strong> {success.details.approval.id}</p>
                  <p className="mb-1"><strong>Amount:</strong> ${success.details.approval.amountUSD} / ₹{success.details.approval.amountINR}</p>
                  <p className="mb-1"><strong>Status:</strong> {success.details.approval.status}</p>
                  <p><strong>Submitted:</strong> {new Date(success.details.approval.submittedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-blue-800 mb-1">
                    <span className="font-semibold">Period:</span> {periodData.periodLabel}
                  </p>
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Amount:</span> 
                    <span className="text-xl font-bold text-blue-600 ml-2">${periodData.amount}</span>
                  </p>
                </div>
                
                {!paymentMethod ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => setPaymentMethod("online")}
                      className="w-full p-4 border-2 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <FaCreditCard className="text-blue-500 text-xl" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-semibold">Online Payment</p>
                        <p className="text-xs text-gray-500">Pay instantly via Razorpay (Credit Card, UPI, NetBanking)</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setPaymentMethod("offline")}
                      className="w-full p-4 border-2 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <FaMoneyBillWave className="text-green-500 text-xl" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-semibold">Offline Payment</p>
                        <p className="text-xs text-gray-500">Upload payment proof for admin approval (Bank Transfer, Cash)</p>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentMethod === "offline" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g., Cash payment with bank receipt #12345"
                            className="w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows="3"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Proof <span className="text-red-500">*</span>
                          </label>
                          <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-blue-500 transition">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={handleFileChange}
                              className="hidden"
                              id="payment-proof"
                            />
                            <label
                              htmlFor="payment-proof"
                              className="cursor-pointer flex flex-col items-center"
                            >
                              <FaUpload className="text-gray-400 text-2xl mb-2" />
                              <span className="text-sm text-gray-600 font-medium">
                                Click to upload receipt/image
                              </span>
                              <span className="text-xs text-gray-400 mt-1">
                                PDF, PNG, JPG up to 5MB
                              </span>
                            </label>
                          </div>
                          {proofPreview && (
                            <div className="mt-2 relative">
                              <img
                                src={proofPreview}
                                alt="Preview"
                                className="max-h-32 rounded-lg border"
                              />
                              <button
                                onClick={() => {
                                  setPaymentProof(null);
                                  setProofPreview(null);
                                }}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                              >
                                <FaTimes size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {error && (
                      <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                        <span className="mt-0.5">⚠️</span>
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setPaymentMethod(null)}
                        className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                        disabled={loading}
                      >
                        Back
                      </button>
                      <button
                        onClick={handlePayment}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <FaSpinner className="animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Confirm Payment"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


export default function VendorPaymentSummary() {
  const vendorId = localStorage.getItem("vendorId") || "6973f68d839888dd480ce933";

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* Monthly Breakdown filter state */
  const [mbSearch, setMbSearch] = useState("");
  const [mbStatus, setMbStatus] = useState("all");
  const [mbPage, setMbPage] = useState(1);

  /* Recent Claims filter state */
  const [rcSearch, setRcSearch] = useState("");
  const [rcStatus, setRcStatus] = useState("all");
  const [rcPage, setRcPage] = useState(1);

  /* Weekly Breakdown filter state */
  const [wbSearch, setWbSearch] = useState("");
  const [wbStatus, setWbStatus] = useState("all");
  const [wbPage, setWbPage] = useState(1);

  /* Payment Modal state */
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    periodData: null,
  });

  /* Payment History Modal state */
  const [historyModal, setHistoryModal] = useState(false);

  /* ── Fetch Dashboard ── */
  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const res = await axios.get(
        `${API_BASE}/vendor/${vendorId}/payment-dashboard`
      );
      setDashboard(res.data);
    } catch (err) {
      console.error(err);
      setDashboard(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [vendorId]);

  /* ── Monthly Breakdown: filter + paginate ── */
  const filteredMB = useMemo(() => {
    const rows = dashboard?.monthlyBreakdown || [];
    return rows.filter((r) => {
      const matchSearch = r.month?.toLowerCase().includes(mbSearch.toLowerCase());
      const matchStatus = mbStatus === "all" || r.paymentStatus === mbStatus;
      return matchSearch && matchStatus;
    });
  }, [dashboard, mbSearch, mbStatus]);

  const mbTotalPages = Math.ceil(filteredMB.length / PAGE_SIZE);
  const paginatedMB = useMemo(() => {
    const s = (mbPage - 1) * PAGE_SIZE;
    return filteredMB.slice(s, s + PAGE_SIZE);
  }, [filteredMB, mbPage]);

  /* ── Recent Claims: filter + paginate ── */
  const filteredRC = useMemo(() => {
    const rows = dashboard?.recentClaims || [];
    return rows.filter((r) => {
      const hay = `${r.couponName} ${r.couponCode} ${r.user?.name} ${r.user?.email} ${r.month}`.toLowerCase();
      const matchSearch = hay.includes(rcSearch.toLowerCase());
      const matchStatus = rcStatus === "all" || r.status === rcStatus;
      return matchSearch && matchStatus;
    });
  }, [dashboard, rcSearch, rcStatus]);

  const rcTotalPages = Math.ceil(filteredRC.length / PAGE_SIZE);
  const paginatedRC = useMemo(() => {
    const s = (rcPage - 1) * PAGE_SIZE;
    return filteredRC.slice(s, s + PAGE_SIZE);
  }, [filteredRC, rcPage]);

  /* ── Weekly Breakdown: filter + paginate ── */
  const filteredWB = useMemo(() => {
    const rows = dashboard?.weeklyBreakdown || [];
    return rows.filter((r) => {
      const matchSearch = r.period?.toLowerCase().includes(wbSearch.toLowerCase());
      const matchStatus = wbStatus === "all" || r.paymentStatus === wbStatus;
      return matchSearch && matchStatus;
    });
  }, [dashboard, wbSearch, wbStatus]);

  const wbTotalPages = Math.ceil(filteredWB.length / PAGE_SIZE);
  const paginatedWB = useMemo(() => {
    const s = (wbPage - 1) * PAGE_SIZE;
    return filteredWB.slice(s, s + PAGE_SIZE);
  }, [filteredWB, wbPage]);

  /* ── CSV exports ── */
  const exportMB = () =>
    exportCSV(
      "monthly_breakdown.csv",
      ["Month", "Coupons", "Total ($)", "Paid ($)", "Pending ($)", "Status", "Last Updated"],
      filteredMB.map((r) => [
        r.month,
        r.totalCoupons,
        r.totalAmount,
        r.amountPaid,
        r.amountPending,
        r.paymentStatus,
        new Date(r.lastUpdated).toLocaleString(),
      ])
    );

  const exportRC = () =>
    exportCSV(
      "recent_claims.csv",
      ["Coupon Name", "Coupon Code", "User Name", "User Email", "User Phone", "Amount ($)", "Month", "Claimed At", "Paid At", "Status"],
      filteredRC.map((r) => [
        r.couponName,
        r.couponCode,
        r.user?.name,
        r.user?.email,
        r.user?.phone,
        r.amount,
        r.month,
        new Date(r.claimedAt).toLocaleString(),
        r.paidAt ? new Date(r.paidAt).toLocaleString() : "",
        r.status,
      ])
    );

  const exportWB = () =>
    exportCSV(
      "weekly_breakdown.csv",
      ["Week", "Period", "Coupons", "Total ($)", "Paid ($)", "Pending ($)", "Status"],
      filteredWB.map((r) => [
        `Week ${r.weekNumber}`,
        r.period,
        r.totalCoupons,
        r.totalAmount,
        r.amountPaid,
        r.amountPending,
        r.paymentStatus,
      ])
    );

  const handlePaymentClick = (periodData) => {
    setPaymentModal({
      isOpen: true,
      periodData,
    });
  };

  const handlePaymentComplete = () => {
    fetchDashboard();
  };

  /* ── Loading / Error states ── */
  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FaSpinner className="animate-spin text-blue-600 text-4xl mb-4" />
        <p className="text-gray-400">Loading dashboard...</p>
      </div>
    );
    
  if (!dashboard || !dashboard.success)
    return (
      <div className="text-center py-20">
        <p className="text-red-400 text-lg mb-2">Failed to load dashboard data.</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );

  const { vendor, summary, monthlyBreakdown, recentClaims, weeklyBreakdown } = dashboard;

  const summaryCards = summary
    ? [
        { label: "Total Earned", value: `$${summary.totalEarned ?? 0}`, icon: <FaDollarSign className="text-blue-500" />, bg: "bg-blue-50" },
        { label: "Total Paid", value: `$${summary.totalPaid ?? 0}`, icon: <FaCheckCircle className="text-green-500" />, bg: "bg-green-50" },
        { label: "Total Pending", value: `$${summary.totalPending ?? 0}`, icon: <FaClock className="text-yellow-500" />, bg: "bg-yellow-50" },
        { label: "Transactions", value: summary.totalTransactions ?? 0, icon: <FaReceipt className="text-purple-500" />, bg: "bg-purple-50" },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">

      {/* ── Vendor Info and Actions ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {vendor && (
          <div className="flex items-center gap-3 bg-white rounded-2xl shadow border p-5 flex-1">
            <div className="bg-blue-100 p-3 rounded-full">
              <FaStore className="text-blue-600 text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-blue-900">{vendor.businessName}</h2>
              <p className="text-sm text-gray-500">{vendor.email} &bull; {vendor.phone}</p>
              <p className="text-xs text-gray-400">Till #: {vendor.tillNumber}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Summary Cards ── */}
      {summaryCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map((card, i) => (
            <div key={i} className={`${card.bg} rounded-2xl shadow-sm border p-5 flex flex-col gap-2`}>
              <div className="text-2xl">{card.icon}</div>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Monthly Breakdown ── */}
      {monthlyBreakdown?.length > 0 && (
        <div className="bg-white rounded-2xl shadow border p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold text-blue-900">Monthly Breakdown</h3>
            <button
              onClick={exportMB}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition w-fit"
            >
              <FaFileExport /> Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative md:w-1/3">
              <FaSearch className="absolute left-3 top-3 text-gray-400" size={12} />
              <input
                type="text"
                placeholder="Search month..."
                value={mbSearch}
                onChange={(e) => { setMbSearch(e.target.value); setMbPage(1); }}
                className="pl-9 pr-4 py-2 w-full border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={mbStatus}
              onChange={(e) => { setMbStatus(e.target.value); setMbPage(1); }}
              className="border px-4 py-2 rounded-lg text-sm md:w-44 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="fully_paid">Fully Paid</option>
              <option value="approval_pending">Approval Pending</option>
            </select>
            <span className="text-xs text-gray-400 self-center">
              {filteredMB.length} result{filteredMB.length !== 1 ? "s" : ""}
            </span>
          </div>

          {paginatedMB.length === 0 ? (
            <p className="text-center py-8 text-gray-400">No records found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border rounded-lg overflow-hidden text-sm">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="p-3 text-center">S No</th>
                    <th className="p-3 text-left">Month</th>
                    <th className="p-3 text-center">Coupons</th>
                    <th className="p-3 text-center">Total ($)</th>
                    <th className="p-3 text-center">Paid ($)</th>
                    <th className="p-3 text-center">Pending ($)</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMB.map((row, idx) => {
                    const formattedMonth = new Date(row.month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });
                    const isPending = row.paymentStatus === "pending" || row.paymentStatus === "payment_pending";
                    
                    return (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="p-3 text-center">{(mbPage - 1) * PAGE_SIZE + idx + 1}</td>
                        <td className="p-3">{formattedMonth}</td>
                        <td className="p-3 text-center">{row.totalCoupons}</td>
                        <td className="p-3 text-center">${row.totalAmount}</td>
                        <td className="p-3 text-center">${row.amountPaid}</td>
                        <td className="p-3 text-center">${row.amountPending}</td>
                        <td className="p-3 text-center"><StatusBadge status={row.paymentStatus} /></td>
                        <td className="p-3 text-center">
                          {isPending && (
                            <button
                              onClick={() => handlePaymentClick({
                                periodType: "monthly",
                                month: row.month,
                                periodLabel: formattedMonth,
                                amount: row.amountPending,
                              })}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition"
                            >
                              Pay Now
                            </button>
                          )}
                          {row.paymentStatus === "paid" && (
                            <span className="text-green-600 text-xs font-medium">✓ Paid</span>
                          )}
                          {row.paymentStatus === "approval_pending" && (
                            <span className="text-purple-600 text-xs font-medium">⏳ Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination page={mbPage} totalPages={mbTotalPages} onChange={setMbPage} />
        </div>
      )}

      {/* ── Weekly Breakdown ── */}
      {weeklyBreakdown?.length > 0 && (
        <div className="bg-white rounded-2xl shadow border p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold text-blue-900">Weekly Breakdown</h3>
            <button
              onClick={exportWB}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition w-fit"
            >
              <FaFileExport /> Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative md:w-1/3">
              <FaSearch className="absolute left-3 top-3 text-gray-400" size={12} />
              <input
                type="text"
                placeholder="Search week..."
                value={wbSearch}
                onChange={(e) => { setWbSearch(e.target.value); setWbPage(1); }}
                className="pl-9 pr-4 py-2 w-full border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={wbStatus}
              onChange={(e) => { setWbStatus(e.target.value); setWbPage(1); }}
              className="border px-4 py-2 rounded-lg text-sm md:w-44 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="fully_paid">Fully Paid</option>
              <option value="approval_pending">Approval Pending</option>
            </select>
            <span className="text-xs text-gray-400 self-center">
              {filteredWB.length} result{filteredWB.length !== 1 ? "s" : ""}
            </span>
          </div>

          {paginatedWB.length === 0 ? (
            <p className="text-center py-8 text-gray-400">No records found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border rounded-lg overflow-hidden text-sm">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="p-3 text-center">S No</th>
                    <th className="p-3 text-left">Week</th>
                    <th className="p-3 text-center">Period</th>
                    <th className="p-3 text-center">Coupons</th>
                    <th className="p-3 text-center">Total ($)</th>
                    <th className="p-3 text-center">Paid ($)</th>
                    <th className="p-3 text-center">Pending ($)</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedWB.map((row, idx) => {
                    const isPending = row.paymentStatus === "pending" || row.paymentStatus === "payment_pending";
                    const [startDate, endDate] = row.period.split(' - ');
                    const month = row.month || startDate?.substring(0, 7);
                    
                    return (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="p-3 text-center">{(wbPage - 1) * PAGE_SIZE + idx + 1}</td>
                        <td className="p-3">Week {row.weekNumber}</td>
                        <td className="p-3 text-center text-xs">{row.period}</td>
                        <td className="p-3 text-center">{row.totalCoupons}</td>
                        <td className="p-3 text-center">${row.totalAmount}</td>
                        <td className="p-3 text-center">${row.amountPaid}</td>
                        <td className="p-3 text-center">${row.amountPending}</td>
                        <td className="p-3 text-center"><StatusBadge status={row.paymentStatus} /></td>
                        <td className="p-3 text-center">
                          {isPending && (
                            <button
                              onClick={() => handlePaymentClick({
                                periodType: "weekly",
                                month: month,
                                startDate,
                                endDate,
                                periodLabel: `Week ${row.weekNumber}, ${row.period}`,
                                amount: row.amountPending,
                              })}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition"
                            >
                              Pay Now
                            </button>
                          )}
                          {row.paymentStatus === "paid" && (
                            <span className="text-green-600 text-xs font-medium">✓ Paid</span>
                          )}
                          {row.paymentStatus === "approval_pending" && (
                            <span className="text-purple-600 text-xs font-medium">⏳ Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination page={wbPage} totalPages={wbTotalPages} onChange={setWbPage} />
        </div>
      )}

      {/* ── Recent Claims ── */}
      {recentClaims?.length > 0 && (
        <div className="bg-white rounded-2xl shadow border p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold text-blue-900">Recent Claims</h3>
            <button
              onClick={exportRC}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition w-fit"
            >
              <FaFileExport /> Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative md:w-1/3">
              <FaSearch className="absolute left-3 top-3 text-gray-400" size={12} />
              <input
                type="text"
                placeholder="Search coupon, user, month..."
                value={rcSearch}
                onChange={(e) => { setRcSearch(e.target.value); setRcPage(1); }}
                className="pl-9 pr-4 py-2 w-full border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={rcStatus}
              onChange={(e) => { setRcStatus(e.target.value); setRcPage(1); }}
              className="border px-4 py-2 rounded-lg text-sm md:w-44 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="fully_paid">Fully Paid</option>
            </select>
            <span className="text-xs text-gray-400 self-center">
              {filteredRC.length} result{filteredRC.length !== 1 ? "s" : ""}
            </span>
          </div>

          {paginatedRC.length === 0 ? (
            <p className="text-center py-8 text-gray-400">No records found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border rounded-lg overflow-hidden text-sm">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="p-3 text-center">S No</th>
                    <th className="p-3 text-left">Coupon</th>
                    <th className="p-3 text-left">User</th>
                    <th className="p-3 text-center">Amount ($)</th>
                    <th className="p-3 text-center">Month</th>
                    <th className="p-3 text-center">Claimed At</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRC.map((claim, idx) => {
                    const formattedMonth = new Date(claim.month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });
                    return (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="p-3 text-center">{(rcPage - 1) * PAGE_SIZE + idx + 1}</td>
                        <td className="p-3">
                          <div className="font-medium">{claim.couponName}</div>
                          <div className="text-xs text-gray-400">{claim.couponCode}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{claim.user?.name}</div>
                          <div className="text-xs text-gray-400">{claim.user?.email}</div>
                          <div className="text-xs text-gray-400">{claim.user?.phone}</div>
                        </td>
                        <td className="p-3 text-center">${claim.amount}</td>
                        <td className="p-3 text-center">{formattedMonth}</td>
                        <td className="p-3 text-center text-xs text-gray-500">
                          {new Date(claim.claimedAt).toLocaleString()}
                        </td>
                        <td className="p-3 text-center"><StatusBadge status={claim.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination page={rcPage} totalPages={rcTotalPages} onChange={setRcPage} />
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal({ isOpen: false, periodData: null })}
        periodData={paymentModal.periodData}
        vendorId={vendorId}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Refresh indicator */}
      {refreshing && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <FaSpinner className="animate-spin" />
          Refreshing...
        </div>
      )}
    </div>
  );
}