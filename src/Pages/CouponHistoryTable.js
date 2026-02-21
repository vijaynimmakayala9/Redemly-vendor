// import React from "react";

// const CouponHistoryTable = () => {
//  // Static coupon history data
// const couponHistory = [
//   {
//     SI_No: 1,
//     Customer_ID: "c685",
//     Coupon_ID: "ROwETB",
//     Discount: "10%",
//     Coupon_Download_Date: "23-09-2025",
//     Coupon_Redeemed_Date: "N/A",
//     Coupon_Redeemed_Time: "N/A",
//     Coupon_Order_Details: "N/A",
//     Order_Value: "$0.00",
//     Feedback: "N/A"
//   },
//   {
//     SI_No: 2,
//     Customer_ID: "c686",
//     Coupon_ID: "Rowter",
//     Discount: "15%",
//     Coupon_Download_Date: "25-10-2025",
//     Coupon_Redeemed_Date: "27-10-2025",
//     Coupon_Redeemed_Time: "4:00pm",
//     Coupon_Order_Details: "Rasmali Falooda, triple chocolate crepes, Mango milk tea",
//     Order_Value: "$26",
//     Feedback: "Falooda and milk tea were amazing, the crepe could have been better"
//   },
//   {
//     SI_No: 3,
//     Customer_ID: "c687",
//     Coupon_ID: "Rowter",
//     Discount: "15%",
//     Coupon_Download_Date: "26-10-2025",
//     Coupon_Redeemed_Date: "26-10-2025",
//     Coupon_Redeemed_Time: "6:00pm",
//     Coupon_Order_Details: "Mutton juicy mandi, Onion samosa, punogulu",
//     Order_Value: "$50",
//     Feedback: "Mandi was the best, snacks were cold"
//   },
//   {
//     SI_No: 4,
//     Customer_ID: "c687",
//     Coupon_ID: "Rowter",
//     Discount: "15%",
//     Coupon_Download_Date: "26-10-2025",
//     Coupon_Redeemed_Date: "27-10-2025",
//     Coupon_Redeemed_Time: "7:00pm",
//     Coupon_Order_Details: "3lb mutton, 5lb chicken",
//     Order_Value: "$60",
//     Feedback: ""
//   }
// ];

//   return (
//     <div className="p-6 bg-white min-h-screen">
//       <div className="max-w-6xl mx-auto bg-white p-6 rounded-xl shadow-lg">
//         <h2 className="text-2xl font-semibold mb-4 text-gray-700 text-center">
//           Coupon Usage History
//         </h2>

//         <div className="overflow-x-auto">
//           <table className="min-w-full border border-gray-200 text-sm">
//             <thead className="bg-green-100 text-gray-600">
//               <tr>
//                 <th className="py-2 px-4 border">SI No</th>
//                 <th className="py-2 px-4 border">Customer ID</th>
//                 <th className="py-2 px-4 border">Coupon ID</th>
//                 <th className="py-2 px-4 border">Discount</th>
//                 <th className="py-2 px-4 border">Coupon Download Date</th>
//                 <th className="py-2 px-4 border">Coupon Redeemed Date</th>
//                 <th className="py-2 px-4 border">Coupon Redeemed Time</th>
//                 <th className="py-2 px-4 border">Coupon Order Details</th>
//                 <th className="py-2 px-4 border">Order Value</th>
//                 <th className="py-2 px-4 border">Feedback</th>
//               </tr>
//             </thead>
//             <tbody>
//               {couponHistory.length === 0 ? (
//                 <tr>
//                   <td colSpan="10" className="py-4 text-gray-500 text-center">
//                     No coupon usage history found.
//                   </td>
//                 </tr>
//               ) : (
//                 couponHistory.map((coupon, index) => (
//                   <tr key={coupon.Coupon_ID + index} className="text-center">
//                     <td className="py-2 px-4 border">{coupon.SI_No || index + 1}</td>
//                     <td className="py-2 px-4 border">{coupon.Customer_ID}</td>
//                     <td className="py-2 px-4 border">{coupon.Coupon_ID}</td>
//                     <td className="py-2 px-4 border">{coupon.Discount}</td>
//                     <td className="py-2 px-4 border">{coupon.Coupon_Download_Date}</td>
//                     <td className="py-2 px-4 border">{coupon.Coupon_Redeemed_Date}</td>
//                     <td className="py-2 px-4 border">{coupon.Coupon_Redeemed_Time}</td>
//                     <td className="py-2 px-4 border">{coupon.Coupon_Order_Details}</td>
//                     <td className="py-2 px-4 border">{coupon.Order_Value}</td>
//                     <td className="py-2 px-4 border">{coupon.Feedback || "-"}</td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CouponHistoryTable;

import React, { useEffect, useState } from "react";
import axios from "axios";

const PAGE_SIZE = 10;

const CouponHistoryTable = () => {
  const vendorId = localStorage.getItem("vendorId");

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [customerId, setCustomerId] = useState("");
  const [couponId, setCouponId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ================= FETCH API =================
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `https://api.redemly.com/api/vendor/coupon-usage-history/${vendorId}`
      );
      setHistory(res.data.history || []);
      setFilteredHistory(res.data.history || []);
    } catch (err) {
      console.error("Failed to fetch coupon history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) fetchHistory();
  }, [vendorId]);

  // ================= FILTER =================
  useEffect(() => {
    let data = [...history];

    if (customerId)
      data = data.filter((d) =>
        d.Customer_ID?.toLowerCase().includes(customerId.toLowerCase())
      );

    if (couponId)
      data = data.filter((d) =>
        d.Coupon_ID?.toLowerCase().includes(couponId.toLowerCase())
      );

    if (fromDate)
      data = data.filter(
        (d) => new Date(d.Coupon_Download_Date) >= new Date(fromDate)
      );

    if (toDate)
      data = data.filter(
        (d) => new Date(d.Coupon_Download_Date) <= new Date(toDate)
      );

    setFilteredHistory(data);
    setCurrentPage(1); // reset page on filter change
  }, [customerId, couponId, fromDate, toDate, history]);

  // ================= PAGINATION =================
  const totalPages = Math.ceil(filteredHistory.length / PAGE_SIZE);

  const paginatedData = filteredHistory.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ================= EXPORT CSV =================
  const exportCSV = () => {
    if (!filteredHistory.length) return;

    const headers = Object.keys(filteredHistory[0]).join(",");
    const rows = filteredHistory.map((row) =>
      Object.values(row)
        .map((v) => `"${v ?? ""}"`)
        .join(",")
    );

    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "coupon-usage-history.csv";
    a.click();
  };

  // ================= UI =================
  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-2xl font-bold text-blue-700">
            Coupon Usage History
          </h2>

          <button
            onClick={exportCSV}
            className="mt-3 md:mt-0 px-5 py-2 rounded-lg text-white font-medium bg-blue-600"
          >
            Export CSV
          </button>
        </div>

        {/* FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <input placeholder="Customer ID" value={customerId}
            onChange={(e)=>setCustomerId(e.target.value)}
            className="border p-2 rounded-lg"/>

          <input placeholder="Coupon ID" value={couponId}
            onChange={(e)=>setCouponId(e.target.value)}
            className="border p-2 rounded-lg"/>

          <input type="date" value={fromDate}
            onChange={(e)=>setFromDate(e.target.value)}
            className="border p-2 rounded-lg"/>

          <input type="date" value={toDate}
            onChange={(e)=>setToDate(e.target.value)}
            className="border p-2 rounded-lg"/>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-blue-100">
              <tr>
                {["SI No","Customer ID","Coupon ID","Discount","Downloaded","Redeemed Date","Redeemed Time","Order Details","Order Value","Feedback"]
                  .map(h=>(<th key={h} className="px-4 py-2 border">{h}</th>))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan="10" className="text-center py-6">Loading...</td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan="10" className="text-center py-6">No data found</td></tr>
              ) : (
                paginatedData.map((row, idx) => (
                  <tr key={idx} className="text-center hover:bg-blue-50">
                    <td className="border px-3 py-2">{row.SI_No}</td>
                    <td className="border px-3 py-2">{row.Customer_ID}</td>
                    <td className="border px-3 py-2 text-blue-600">{row.Coupon_ID}</td>
                    <td className="border px-3 py-2">{row.Discount}</td>
                    <td className="border px-3 py-2">{row.Coupon_Download_Date}</td>
                    <td className="border px-3 py-2">{row.Coupon_Redeemed_Date}</td>
                    <td className="border px-3 py-2">{row.Coupon_Redeemed_Time}</td>
                    <td className="border px-3 py-2">{row.Coupon_Order_Details || "-"}</td>
                    <td className="border px-3 py-2">{row.Order_Value}</td>
                    <td className="border px-3 py-2">{row.Feedback || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <p className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={()=>setCurrentPage(p=>p-1)}
                className="px-4 py-2 border rounded disabled:opacity-40"
              >
                Prev
              </button>

              <button
                disabled={currentPage === totalPages}
                onClick={()=>setCurrentPage(p=>p+1)}
                className="px-4 py-2 border rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CouponHistoryTable;
