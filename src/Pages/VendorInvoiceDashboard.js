import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaFileInvoiceDollar,
  FaCreditCard,
  FaChartLine,
  FaCashRegister,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaShoppingBag,
  FaUpload,
  FaArrowLeft,
  FaArrowRight,
} from "react-icons/fa";

const API_BASE = "https://api.redemly.com/api";

export default function VendorInvoiceDashboard() {
  const vendorId = localStorage.getItem("vendorId");

  const [viewMode, setViewMode] = useState("monthly");
  const [selectedMonth, setSelectedMonth] = useState("2026-02");
  const [weeksCount, setWeeksCount] = useState(4);
  
  const [monthlyData, setMonthlyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [offlineRequest, setOfflineRequest] = useState(null);
  
  // Offline payment form state
  const [offlineDescription, setOfflineDescription] = useState("");
  const [paymentProof, setPaymentProof] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Selected week for payment
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  useEffect(() => {
    if (viewMode === "monthly") fetchMonthly();
    else fetchWeekly();
  }, [viewMode, selectedMonth, weeksCount]);

  /* ---------------- Fetch Monthly ---------------- */
  const fetchMonthly = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(
        `${API_BASE}/vendor/${vendorId}/payments/monthly?month=${selectedMonth}`
      );
      setMonthlyData(res.data);
    } catch (error) {
      setMonthlyData(null);
      setError(error.response?.data?.message || "No monthly invoice available for selected period.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Fetch Weekly ---------------- */
  const fetchWeekly = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(
        `${API_BASE}/vendor/${vendorId}/payments/weekly?weeks=${weeksCount}`
      );
      setWeeklyData(res.data);
      setSelectedWeekIndex(0); // Reset to first week
    } catch (error) {
      setWeeklyData(null);
      setError(error.response?.data?.message || "No weekly data available.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Initiate Online Payment ---------------- */
  const handleInitiateOnline = async () => {
    try {
      setPaymentLoading(true);
      
      let payload;
      if (viewMode === "monthly") {
        payload = { periodType: "monthly", month: selectedMonth };
      } else {
        const selectedWeek = weeklyData?.summaries[selectedWeekIndex];
        payload = { 
          periodType: "weekly", 
          month: selectedMonth,
          startDate: selectedWeek?.startDate.split('T')[0],
          endDate: selectedWeek?.endDate.split('T')[0]
        };
      }

      const res = await axios.post(
        `${API_BASE}/vendor/${vendorId}/payments/initiate-online`,
        payload
      );

      const approval = res.data.approval;
      
      if (!window.Razorpay) {
        alert("Razorpay not loaded. Please refresh and try again.");
        return;
      }

      // Create Razorpay order
      const orderRes = await axios.post(
        `${API_BASE}/vendor/${vendorId}/payments/online`,
        {
          period: viewMode,
          amountINR: approval.amountINR,
          month: selectedMonth,
          ...(viewMode === "weekly" && {
            startDate: weeklyData?.summaries[selectedWeekIndex]?.startDate.split('T')[0],
            endDate: weeklyData?.summaries[selectedWeekIndex]?.endDate.split('T')[0]
          })
        }
      );

      const order = orderRes.data.data;

      const options = {
        key: order.razorpayKey,
        amount: order.amountINR * 100,
        currency: order.currency,
        name: monthlyData?.vendor || weeklyData?.vendor || "Vendor",
        description: approval.description,
        order_id: order.orderId,
        handler: async (response) => {
          try {
            await axios.post(
              `${API_BASE}/vendor/${vendorId}/payments/verify`,
              {
                ...response,
                month: selectedMonth,
                ...(viewMode === "weekly" && {
                  startDate: weeklyData?.summaries[selectedWeekIndex]?.startDate.split('T')[0],
                  endDate: weeklyData?.summaries[selectedWeekIndex]?.endDate.split('T')[0]
                })
              }
            );
            alert("✅ Payment successful");
            viewMode === "monthly" ? fetchMonthly() : fetchWeekly();
          } catch {
            alert("❌ Payment verification failed");
          }
        },
        theme: { color: "#2563EB" },
      };

      new window.Razorpay(options).open();
    } catch (error) {
      alert("❌ Failed to initiate payment: " + (error.response?.data?.message || error.message));
    } finally {
      setPaymentLoading(false);
    }
  };

  /* ---------------- Handle Offline Payment ---------------- */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPaymentProof(file);
    }
  };

  const handleOfflineSubmit = async (e) => {
    e.preventDefault();
    if (!paymentProof) {
      alert("Please upload payment proof");
      return;
    }

    try {
      setPaymentLoading(true);
      
      const formData = new FormData();
      formData.append("periodType", viewMode);
      formData.append("month", selectedMonth);
      
      if (viewMode === "weekly") {
        const selectedWeek = weeklyData?.summaries[selectedWeekIndex];
        formData.append("startDate", selectedWeek.startDate.split('T')[0]);
        formData.append("endDate", selectedWeek.endDate.split('T')[0]);
      }
      
      formData.append("description", offlineDescription || `Cash payment for ${viewMode} period`);
      formData.append("paymentProof", paymentProof);

      const res = await axios.post(
        `${API_BASE}/vendor/${vendorId}/payments/request-offline`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          },
        }
      );

      setOfflineRequest(res.data.approval);
      setShowOfflineForm(false);
      alert("✅ Offline payment request submitted successfully!");
      
      // Refresh data
      viewMode === "monthly" ? fetchMonthly() : fetchWeekly();
    } catch (error) {
      alert("❌ Failed to submit offline payment: " + (error.response?.data?.message || error.message));
    } finally {
      setPaymentLoading(false);
      setUploadProgress(0);
      setPaymentProof(null);
      setOfflineDescription("");
    }
  };

  const statusColor = (status) => {
    if (!status) return "text-gray-500";
    if (status === "fully_paid" || status === "paid") return "text-emerald-600";
    if (status === "partial") return "text-amber-500";
    return "text-rose-500";
  };

  const statusLabel = (status) => {
    if (!status) return "—";
    return status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-2">
              <FaFileInvoiceDollar className="text-blue-600" />
              Vendor Payments
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {viewMode === "monthly" ? "Monthly invoice & records" : "Weekly payment summary"}
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-white border rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-5 py-2.5 text-sm font-medium transition-all ${
                viewMode === "monthly"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode("weekly")}
              className={`px-5 py-2.5 text-sm font-medium transition-all ${
                viewMode === "weekly"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          {viewMode === "monthly" ? (
            <div className="flex items-center gap-2 bg-white border rounded-xl px-4 py-2.5 shadow-sm">
              <FaCalendarAlt className="text-blue-500 text-sm" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="outline-none text-sm text-slate-700 bg-transparent"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white border rounded-xl px-4 py-2.5 shadow-sm">
              <FaChartLine className="text-blue-500 text-sm" />
              <label className="text-sm text-slate-500">Weeks:</label>
              <select
                value={weeksCount}
                onChange={(e) => setWeeksCount(Number(e.target.value))}
                className="outline-none text-sm text-slate-700 bg-transparent"
              >
                {[1, 2, 3, 4, 6, 8].map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-20 text-slate-400 text-sm animate-pulse">
            Loading data...
          </div>
        )}
        {error && !loading && (
          <div className="text-center py-20 text-slate-400 text-sm">{error}</div>
        )}

        {/* ===== MONTHLY VIEW ===== */}
        {!loading && viewMode === "monthly" && monthlyData && (
          <div className="space-y-5">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryCard
                label="Total Coupons"
                value={monthlyData.summary.totalCoupons}
                icon={<FaShoppingBag />}
                color="blue"
              />
              <SummaryCard
                label="Total Amount"
                value={`$${monthlyData.summary.totalAmount}`}
                icon={<FaChartLine />}
                color="indigo"
              />
              <SummaryCard
                label="Amount Pending"
                value={`$${monthlyData.summary.amountPending}`}
                icon={<FaClock />}
                color="amber"
              />
              <SummaryCard
                label="Status"
                value={statusLabel(monthlyData.summary.paymentStatus)}
                icon={<FaCheckCircle />}
                color={
                  monthlyData.summary.paymentStatus === "paid" || monthlyData.summary.paymentStatus === "fully_paid"
                    ? "green"
                    : "rose"
                }
                highlight
              />
            </div>

            {/* Last Updated */}
            <div className="text-xs text-slate-400 text-right">
              Last Updated: {new Date(monthlyData.summary.lastUpdated).toLocaleString()}
            </div>

            {/* Records Table - Pending */}
            {monthlyData.records.pending?.length > 0 && (
              <Section title={`Pending Records (${monthlyData.records.pending.length})`} icon={<FaClock className="text-amber-500" />}>
                <RecordsTable records={monthlyData.records.pending} />
              </Section>
            )}

            {/* Records Table - Paid */}
            {monthlyData.records.paid?.length > 0 && (
              <Section title={`Paid Records (${monthlyData.records.paid.length})`} icon={<FaCheckCircle className="text-emerald-500" />}>
                <RecordsTable records={monthlyData.records.paid} />
              </Section>
            )}

            {/* Records Table - Verified */}
            {monthlyData.records.verified?.length > 0 && (
              <Section title={`Verified Records (${monthlyData.records.verified.length})`} icon={<FaCheckCircle className="text-blue-500" />}>
                <RecordsTable records={monthlyData.records.verified} />
              </Section>
            )}

            {/* Totals Summary */}
            <div className="bg-slate-100 rounded-xl p-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Records:</span>
                <span className="font-semibold">{monthlyData.totals.totalRecords}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-slate-600">Paid:</span>
                <span className="font-semibold text-emerald-600">{monthlyData.totals.paidRecords}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-slate-600">Pending:</span>
                <span className="font-semibold text-amber-600">{monthlyData.totals.pendingRecords}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-slate-600">Verified:</span>
                <span className="font-semibold text-blue-600">{monthlyData.totals.verifiedRecords}</span>
              </div>
            </div>
          </div>
        )}

        {/* ===== WEEKLY VIEW ===== */}
        {!loading && viewMode === "weekly" && weeklyData && (
          <div className="space-y-4">
            <div className="text-sm text-slate-500 font-medium">
              Vendor: <span className="text-slate-700">{weeklyData.vendor}</span>
            </div>
            
            {/* Week Navigation */}
            {weeklyData.summaries.length > 1 && (
              <div className="flex items-center justify-between bg-white border rounded-xl p-2">
                <button
                  onClick={() => setSelectedWeekIndex(Math.max(0, selectedWeekIndex - 1))}
                  disabled={selectedWeekIndex === 0}
                  className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaArrowLeft />
                </button>
                <span className="text-sm font-medium">
                  Week {selectedWeekIndex + 1} of {weeklyData.summaries.length}
                </span>
                <button
                  onClick={() => setSelectedWeekIndex(Math.min(weeklyData.summaries.length - 1, selectedWeekIndex + 1))}
                  disabled={selectedWeekIndex === weeklyData.summaries.length - 1}
                  className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaArrowRight />
                </button>
              </div>
            )}

            {/* Week Display */}
            {weeklyData.summaries.map((week, index) => (
              index === selectedWeekIndex && (
                <div key={index} className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                  {/* Week header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50">
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt className="text-blue-500 text-sm" />
                      <span className="font-semibold text-slate-700">
                        {week.weekNumber}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">
                        {formatDate(week.startDate)} – {formatDate(week.endDate)}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full ${
                        week.paymentStatus === "fully_paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {statusLabel(week.paymentStatus)}
                    </span>
                  </div>

                  {/* Week stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0">
                    <WeekStat label="Coupons" value={week.totalCoupons} />
                    <WeekStat label="Total" value={`$${week.totalAmount}`} />
                    <WeekStat
                      label="Paid"
                      value={`$${week.amountPaid}`}
                      green={week.amountPaid > 0}
                    />
                    <WeekStat
                      label="Pending"
                      value={`$${week.amountPending}`}
                      amber={week.amountPending > 0}
                    />
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {/* Payment Options Section - Show if data exists */}
        {!loading && ((viewMode === "monthly" && monthlyData) || (viewMode === "weekly" && weeklyData)) && (
          <Section title="Payment Options" icon={<FaCreditCard className="text-blue-500" />}>
            {offlineRequest && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <h4 className="font-semibold text-green-700 mb-2">Offline Payment Request Submitted</h4>
                <p className="text-sm text-green-600">Request ID: {offlineRequest.id}</p>
                <p className="text-sm text-green-600">Status: {offlineRequest.status}</p>
                <p className="text-sm text-green-600">Amount: ${offlineRequest.amountUSD} (₹{offlineRequest.amountINR})</p>
                <p className="text-sm text-green-600">Period: {offlineRequest.periodLabel}</p>
                <p className="text-sm text-green-600">Records: {offlineRequest.recordCount}</p>
                <p className="text-sm text-green-600">Submitted: {new Date(offlineRequest.submittedAt).toLocaleString()}</p>
                {offlineRequest.paymentProof && (
                  <a 
                    href={offlineRequest.paymentProof} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                  >
                    View Payment Proof
                  </a>
                )}
              </div>
            )}

            {!showOfflineForm ? (
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  disabled={paymentLoading}
                  onClick={handleInitiateOnline}
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <FaCreditCard />
                  {paymentLoading ? "Processing..." : "Pay Online (Razorpay)"}
                </button>
                <button
                  disabled={paymentLoading}
                  onClick={() => setShowOfflineForm(true)}
                  className="flex items-center justify-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <FaCashRegister />
                  Pay Offline
                </button>
              </div>
            ) : (
              <form onSubmit={handleOfflineSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={offlineDescription}
                    onChange={(e) => setOfflineDescription(e.target.value)}
                    placeholder="e.g., Cash payment with bank receipt"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    rows="2"
                  />
                </div>

                {viewMode === "weekly" && weeklyData?.summaries[selectedWeekIndex] && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Payment Period:</span> {weeklyData.summaries[selectedWeekIndex].weekNumber}<br />
                      <span className="text-xs">{formatDate(weeklyData.summaries[selectedWeekIndex].startDate)} - {formatDate(weeklyData.summaries[selectedWeekIndex].endDate)}</span>
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Proof (Image or PDF)
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
                      <FaUpload />
                      <span>Choose File</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    {paymentProof && (
                      <span className="text-sm text-slate-600">
                        {paymentProof.name}
                      </span>
                    )}
                  </div>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-2">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{uploadProgress}% uploaded</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={paymentLoading || !paymentProof}
                    className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {paymentLoading ? "Submitting..." : "Submit Offline Request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOfflineForm(false);
                      setPaymentProof(null);
                      setOfflineDescription("");
                    }}
                    className="px-6 py-2 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

/* ---------------- Sub-components ---------------- */

function SummaryCard({ label, value, icon, color, highlight }) {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50",
    indigo: "text-indigo-600 bg-indigo-50",
    amber: "text-amber-600 bg-amber-50",
    green: "text-emerald-600 bg-emerald-50",
    rose: "text-rose-600 bg-rose-50",
  };
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`text-lg font-bold capitalize ${highlight ? colorMap[color].split(" ")[0] : "text-slate-800"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b bg-slate-50">
        {icon}
        <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function RecordsTable({ records }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="text-left text-slate-400 text-xs uppercase tracking-wide border-b">
            <th className="pb-2 font-medium">Coupon</th>
            <th className="pb-2 font-medium">Code</th>
            <th className="pb-2 font-medium">Category</th>
            <th className="pb-2 font-medium">User</th>
            <th className="pb-2 font-medium">Amount</th>
            <th className="pb-2 font-medium">Claimed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
              <td className="py-3 font-medium text-slate-700">{r.couponName}</td>
              <td className="py-3">
                <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                  {r.couponCode}
                </span>
              </td>
              <td className="py-3">
                <span className="flex items-center gap-1 text-slate-500">
                  <FaShoppingBag className="text-xs" />
                  {r.category}
                </span>
              </td>
              <td className="py-3">
                <p className="text-slate-700">{r.user.name}</p>
                <p className="text-xs text-slate-400">{r.user.phone}</p>
              </td>
              <td className="py-3 font-semibold text-slate-700">${r.amount}</td>
              <td className="py-3 text-slate-400 text-xs">
                {new Date(r.claimedAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeekStat({ label, value, green, amber }) {
  return (
    <div className="px-5 py-4 flex flex-col gap-1">
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className={`text-xl font-bold ${
          green ? "text-emerald-600" : amber ? "text-amber-600" : "text-slate-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}