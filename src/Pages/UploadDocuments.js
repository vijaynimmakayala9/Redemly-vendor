import React, { useState, useRef } from "react";
import { FaUpload, FaTrash, FaTimes } from "react-icons/fa";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const UploadDocuments = () => {
  const navigate = useNavigate();
  
  // File input refs for each field
  const aadhaarRef = useRef(null);
  const panRef = useRef(null);
  const gstRef = useRef(null);
  const licenseRef = useRef(null);

  const [formData, setFormData] = useState({
    aadhaarCard: null,
    panCard: null,
    gstCertificate: null,
    businessLicense: null,
  });

  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({
        ...prev,
        [name]: files[0],
      }));
    }
  };

  // Remove specific file
  const handleRemoveFile = (fieldName) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: null,
    }));

    // Clear the file input
    switch (fieldName) {
      case 'aadhaarCard':
        if (aadhaarRef.current) aadhaarRef.current.value = '';
        break;
      case 'panCard':
        if (panRef.current) panRef.current.value = '';
        break;
      case 'gstCertificate':
        if (gstRef.current) gstRef.current.value = '';
        break;
      case 'businessLicense':
        if (licenseRef.current) licenseRef.current.value = '';
        break;
    }
  };

  // Clear all files
  const handleClearAll = () => {
    setFormData({
      aadhaarCard: null,
      panCard: null,
      gstCertificate: null,
      businessLicense: null,
    });

    // Clear all file inputs
    if (aadhaarRef.current) aadhaarRef.current.value = '';
    if (panRef.current) panRef.current.value = '';
    if (gstRef.current) gstRef.current.value = '';
    if (licenseRef.current) licenseRef.current.value = '';
  };

  // Handle cancel - go back
  const handleCancel = () => {
    handleClearAll();
    navigate(-1); // Go back to previous page
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if all files are uploaded
    const requiredFields = ['aadhaarCard', 'panCard', 'gstCertificate', 'businessLicense'];
    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      alert(`Please upload all required documents. Missing: ${missingFields.join(', ')}`);
      return;
    }

    const vendorId = localStorage.getItem("vendorId");
    if (!vendorId) {
      alert("Vendor ID not found. Please login again.");
      return;
    }

    setUploading(true);

    try {
      const uploadedFiles = new FormData();
      uploadedFiles.append("aadhaarCard", formData.aadhaarCard);
      uploadedFiles.append("panCard", formData.panCard);
      uploadedFiles.append("gstCertificate", formData.gstCertificate);
      uploadedFiles.append("businessLicense", formData.businessLicense);

      const response = await axios.post(
        `https://api.redemly.com/api/vendor/upload-documents/${vendorId}`,
        uploadedFiles,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        alert("Documents uploaded successfully!");
        handleClearAll();
        navigate(-1); // Go back after successful upload
      }
    } catch (error) {
      console.error("Error uploading documents:", error);
      alert(error.response?.data?.message || "Error uploading documents. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const renderUploadField = (label, name, ref) => (
    <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-xl shadow-md border border-gray-200 hover:border-blue-400 transition-all duration-300">
      <label className="text-gray-700 font-medium text-center">{label}</label>
      
      <div className="flex items-center gap-3">
        <label
          htmlFor={name}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs rounded-lg cursor-pointer hover:bg-blue-700 transition shadow-md"
        >
          <FaUpload size={14} /> Choose File
        </label>
        
        <input
          ref={ref}
          type="file"
          id={name}
          name={name}
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          className="hidden"
        />
        
        {formData[name] && (
          <button
            type="button"
            onClick={() => handleRemoveFile(name)}
            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
            title="Remove file"
          >
            <FaTrash size={12} />
          </button>
        )}
      </div>
      
      {formData[name] && (
        <div className="mt-2 text-center">
          <span className="text-xs text-green-600 font-medium block truncate w-40">
            ✓ {formData[name].name}
          </span>
          <span className="text-[10px] text-gray-500">
            {(formData[name].size / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
      )}
      
      {!formData[name] && (
        <span className="text-xs text-gray-400 italic mt-1">
          No file selected
        </span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 to-green-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-4xl w-full"
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-700">
            Upload Vendor Documents
          </h1>
        </div>

        <div className="mb-6 p-4 bg-blue-100 border border-blue-300 rounded-xl">
          <h2 className="text-lg font-medium text-blue-800 flex items-center gap-2 mb-2">
            <FaUpload /> Document Upload Form
          </h2>
          <p className="text-sm text-blue-700">
            Please upload all required documents. Supported formats: PDF, JPG, JPEG, PNG, DOC, DOCX
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {renderUploadField("TIN Number", "aadhaarCard", aadhaarRef)}
          {renderUploadField("State ID", "panCard", panRef)}
          {renderUploadField("Driving License", "gstCertificate", gstRef)}
          {renderUploadField("Business Certificate", "businessLicense", licenseRef)}
        </div>

        {/* File Preview Summary */}
        {/* {Object.values(formData).some(file => file !== null) && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-300 rounded-xl">
            <h3 className="font-medium text-gray-700 mb-2">Selected Files:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(formData).map(([key, file]) => (
                file && (
                  <div key={key} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg">
                    <span className="text-xs text-gray-700 truncate max-w-[120px]">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-xs text-green-600 font-medium">✓</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )} */}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-300">
          <button
            type="button"
            onClick={handleClearAll}
            disabled={!Object.values(formData).some(file => file !== null)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaTrash size={12} />
            Clear All
          </button>

          <button
            type="submit"
            disabled={uploading || !Object.values(formData).every(file => file !== null)}
            className="bg-purple-900 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white inline-block mr-2"></div>
                Uploading...
              </>
            ) : (
              "Submit Documents"
            )}
          </button>
        </div>

        {/* File Requirements */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <h3 className="font-medium text-yellow-800 mb-2 text-sm">Important Notes:</h3>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• All documents are required for verification</li>
            <li>• Maximum file size: 10MB per document</li>
            <li>• Clear, legible scans/photos are required</li>
            <li>• Files will be securely stored and encrypted</li>
          </ul>
        </div>
      </form>
    </div>
  );
};

export default UploadDocuments;