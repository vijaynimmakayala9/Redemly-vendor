import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";

const PAGE_SIZE = 10;

const escapeCSV = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;

const getPageNumbers = (currentPage, totalPages) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
  if (currentPage >= totalPages - 3)
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
};

const Skeleton = () => (
  <div style={{ padding: "1rem" }}>
    {[...Array(5)].map((_, i) => (
      <div key={i} style={{ height: 38, background: "#f3f4f6", borderRadius: 8, marginBottom: 10, animation: "pulse 1.5s infinite" }} />
    ))}
    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
  </div>
);

const CouponHistoryTable = () => {
  const vendorId = localStorage.getItem("vendorId");

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);

  const [customerId, setCustomerId] = useState("");
  const [couponId, setCouponId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `https://api.redemly.com/api/vendor/coupon-usage-history/${vendorId}`
      );
      setHistory(res.data.history || []);
    } catch (err) {
      console.error("Failed to fetch coupon history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) fetchHistory();
  }, [vendorId]);

  const filteredHistory = useMemo(() => {
    let data = [...history];
    if (customerId)
      data = data.filter((d) => d.Customer_ID?.toLowerCase().includes(customerId.toLowerCase()));
    if (couponId)
      data = data.filter((d) => d.Coupon_ID?.toLowerCase().includes(couponId.toLowerCase()));
    if (fromDate)
      data = data.filter((d) => new Date(d.Downloaded) >= new Date(fromDate));
    if (toDate)
      data = data.filter((d) => new Date(d.Downloaded) <= new Date(toDate));
    return data;
  }, [history, customerId, couponId, fromDate, toDate]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [customerId, couponId, fromDate, toDate]);

  const totalPages = Math.ceil(filteredHistory.length / PAGE_SIZE);
  const paginatedData = filteredHistory.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const exportCSV = () => {
    if (!filteredHistory.length) return;
    const headers = [
      "SI No", "Customer ID", "Coupon ID", "Discount",
      "Download Date", "Redeemed Date", "Redeemed Time",
      "Order Details", "Order Value", "Feedback",
    ];
    const rows = filteredHistory.map((row) =>
      [
        row.SI_No, row.Customer_ID, row.Coupon_ID, row.Discount,
        row.Downloaded, row.Redeemed_Date,
        row.Redeemed_Time,
        row.Order_Details, row.Order_Value, row.Feedback,
      ].map(escapeCSV)
    );
    const csv = [headers.map(escapeCSV).join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "coupon-usage-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputStyle = {
    border: "1px solid #d1d5db",
    padding: "7px 11px",
    borderRadius: 8,
    fontSize: 13,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
    color: "#111827",
  };

  const btnPrimary = {
    padding: "7px 16px",
    background: "#1d4ed8",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const thStyle = {
    padding: "9px 8px",
    textAlign: "left",
    fontWeight: 500,
    whiteSpace: "nowrap",
    fontSize: 12,
    borderBottom: "2px solid #1e40af",
  };

  const tdStyle = {
    padding: "8px",
    fontSize: 12,
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "middle",
  };

  return (
    <div style={{ padding: "1rem", maxWidth: 1200, margin: "0 auto", fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1d4ed8", margin: 0 }}>Coupon Usage History</h2>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "3px 0 0" }}>
            {filteredHistory.length} record{filteredHistory.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={exportCSV} style={btnPrimary}>↓ Export CSV</button>
      </div>

      {/* Filters */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: "1.25rem" }}>
        <input
          style={inputStyle}
          placeholder="Search Customer ID"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Search Coupon ID"
          value={couponId}
          onChange={(e) => setCouponId(e.target.value)}
        />
        <input
          type="date"
          style={inputStyle}
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          title="From Date"
        />
        <input
          type="date"
          style={inputStyle}
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          title="To Date"
        />
        {(customerId || couponId || fromDate || toDate) && (
          <button
            onClick={() => { setCustomerId(""); setCouponId(""); setFromDate(""); setToDate(""); }}
            style={{ ...inputStyle, background: "#f3f4f6", cursor: "pointer", color: "#374151", border: "1px solid #d1d5db", width: "auto" }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Desktop Table */}
      <div className="dt-table" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
          <thead>
            <tr style={{ background: "#1d4ed8", color: "#fff" }}>
              {["#", "Customer ID", "Coupon ID", "Discount", "Downloaded", "Redeemed Date", "Redeemed Time", "Order Details", "Value", "Feedback"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ padding: "2rem", textAlign: "center" }}><Skeleton /></td></tr>
            ) : paginatedData.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>No records found</td></tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  style={{ background: idx % 2 === 0 ? "#fff" : "#f9fafb", transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#f9fafb")}
                >
                  <td style={{ ...tdStyle, color: "#9ca3af" }}>{row.SI_No}</td>
                  <td style={tdStyle}>{row.Customer_ID}</td>
                  <td style={{ ...tdStyle, color: "#4f46e5", fontFamily: "monospace", fontWeight: 600 }}>{row.Coupon_ID}</td>
                  <td style={tdStyle}>
                    <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: 11, padding: "2px 7px", borderRadius: 999, fontWeight: 500 }}>
                      {row.Discount}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: "#6b7280", whiteSpace: "nowrap" }}>{row.Downloaded}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{row.Redeemed_Date}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap", fontWeight: 500 }}>
                    {row.Redeemed_Time}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.Order_Details || "N/A"}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{row.Order_Value}</td>
                  <td style={{ ...tdStyle, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6b7280" }}>
                    {row.Feedback || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="mc-cards">
        {loading ? (
          <Skeleton />
        ) : paginatedData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>No records found</div>
        ) : (
          paginatedData.map((row, idx) => (
            <div key={idx} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, marginBottom: 12, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>

              {/* Card top */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{row.Customer_ID}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>SI #{row.SI_No}</div>
                </div>
                <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: 12, padding: "3px 9px", borderRadius: 999, fontWeight: 600 }}>
                  {row.Discount}
                </span>
              </div>

              {/* Coupon code */}
              <div style={{ background: "#f5f3ff", border: "1px dashed #a78bfa", borderRadius: 6, padding: "6px 10px", marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 500 }}>Coupon ID</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#4f46e5", fontSize: 13 }}>{row.Coupon_ID}</span>
              </div>

              {/* Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: 12 }}>
                {[
                  ["Downloaded", row.Downloaded],
                  ["Redeemed Date", row.Redeemed_Date],
                  ["Redeemed Time", row.Redeemed_Time],
                  ["Order Value", row.Order_Value],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ color: "#9ca3af", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                    <div style={{ color: "#111827", fontWeight: 500, marginTop: 1 }}>{val || "N/A"}</div>
                  </div>
                ))}
              </div>

              {/* Expandable order + feedback */}
              {(row.Order_Details || row.Feedback) && (
                <div style={{ marginTop: 10, borderTop: "1px solid #f3f4f6", paddingTop: 8 }}>
                  <button
                    onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                    style={{ background: "none", border: "none", fontSize: 12, color: "#1d4ed8", cursor: "pointer", padding: 0 }}
                  >
                    {expandedRow === idx ? "▲ Hide details" : "▼ Order & feedback"}
                  </button>
                  {expandedRow === idx && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#374151", lineHeight: 1.6 }}>
                      {row.Order_Details && row.Order_Details !== "N/A" && (
                        <div style={{ marginBottom: 5 }}><span style={{ fontWeight: 500 }}>Order: </span>{row.Order_Details}</div>
                      )}
                      {row.Feedback && (
                        <div><span style={{ fontWeight: 500 }}>Feedback: </span>{row.Feedback}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Responsive switch */}
      <style>{`
        .dt-table { display: block; }
        .mc-cards { display: none; }
        @media (max-width: 767px) {
          .dt-table { display: none; }
          .mc-cards { display: block; }
        }
      `}</style>

      {/* Pagination */}
      {totalPages > 1 && (
        <>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, marginTop: "1.25rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: currentPage === 1 ? "#f9fafb" : "#fff", color: currentPage === 1 ? "#9ca3af" : "#374151", cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: 13 }}
            >
              ← Prev
            </button>

            {pageNumbers.map((p, i) =>
              p === "..." ? (
                <span key={`e${i}`} style={{ padding: "5px 4px", color: "#9ca3af", fontSize: 13, userSelect: "none" }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  style={{ padding: "5px 10px", borderRadius: 6, minWidth: 32, border: currentPage === p ? "1px solid #1d4ed8" : "1px solid #d1d5db", background: currentPage === p ? "#1d4ed8" : "#fff", color: currentPage === p ? "#fff" : "#374151", fontWeight: currentPage === p ? 600 : 400, cursor: "pointer", fontSize: 13 }}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: currentPage === totalPages ? "#f9fafb" : "#fff", color: currentPage === totalPages ? "#9ca3af" : "#374151", cursor: currentPage === totalPages ? "not-allowed" : "pointer", fontSize: 13 }}
            >
              Next →
            </button>
          </div>

          <div style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
            Page {currentPage} of {totalPages} · Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredHistory.length)} of {filteredHistory.length}
          </div>
        </>
      )}
    </div>
  );
};

export default CouponHistoryTable;