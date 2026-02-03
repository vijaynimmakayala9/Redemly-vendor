import React, { useEffect, useState } from "react";
import axios from "axios";
import { Edit2, Save, X, MapPin, Phone, Mail, User, Building, Map, FileText, Globe, CheckCircle, Clock, Plus, Trash2 } from "lucide-react";

const MyProfile = () => {
  const vendorId = localStorage.getItem("vendorId");
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatedVendor, setUpdatedVendor] = useState({});

  // Fetch vendor details
  const fetchProfile = async () => {
    try {
      const res = await axios.get(
        `https://api.redemly.com/api/vendor/getById/${vendorId}`
      );
      setVendor(res.data.vendor);
      setUpdatedVendor(res.data.vendor);
    } catch (err) {
      console.log("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) fetchProfile();
  }, []);

  // Handle input changes for editing
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUpdatedVendor({
      ...updatedVendor,
      [name]: value
    });
  };

  // Handle address changes
  const handleAddressChange = (index, field, value) => {
    const newAddresses = [...updatedVendor.addresses];
    newAddresses[index][field] = value;
    setUpdatedVendor({
      ...updatedVendor,
      addresses: newAddresses
    });
  };

  // Add new address
  const handleAddAddress = () => {
    const newAddress = {
      street: "",
      city: "",
      zipcode: ""
      // Don't add _id for new addresses - let backend handle it
    };
    
    setUpdatedVendor({
      ...updatedVendor,
      addresses: [...updatedVendor.addresses, newAddress]
    });
  };

  // Remove address
  const handleRemoveAddress = (index) => {
    if (updatedVendor.addresses.length <= 1) {
      alert("At least one address is required");
      return;
    }
    
    const newAddresses = [...updatedVendor.addresses];
    newAddresses.splice(index, 1);
    setUpdatedVendor({
      ...updatedVendor,
      addresses: newAddresses
    });
  };

  // Prepare addresses for API - ensure all have proper structure
  const prepareAddressesForAPI = (addresses) => {
    return addresses.map(addr => {
      // Ensure each address has all required fields
      const cleanAddress = {
        street: addr.street || "",
        city: addr.city || "",
        zipcode: addr.zipcode || ""
      };
      
      // Only include _id if it exists and is not a temporary one
      if (addr._id && !addr._id.toString().startsWith('temp-')) {
        cleanAddress._id = addr._id;
      }
      
      return cleanAddress;
    });
  };

  // Update vendor API call
  const handleUpdate = async () => {
    try {
      setSaving(true);
      
      // Prepare the data for API
      const dataToSend = {
        ...updatedVendor,
        addresses: prepareAddressesForAPI(updatedVendor.addresses)
      };
      
      console.log("Sending data:", JSON.stringify(dataToSend, null, 2));
      
      const res = await axios.put(
        `https://api.redemly.com/api/vendor/update/${vendorId}`,
        dataToSend,
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (res.data.success) {
        // Refetch to get the updated data with proper _ids
        await fetchProfile();
        setEditing(false);
        alert("Profile updated successfully!");
      } else {
        alert("Failed to update profile: " + res.data.message);
      }
    } catch (err) {
      console.error("Update error:", err.response?.data || err);
      alert("Error updating profile: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-xl font-semibold text-blue-600">Loading Profile...</div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="text-center">
          <div className="text-2xl text-red-600 font-bold mb-2">Failed to load profile</div>
          <button
            onClick={fetchProfile}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-yellow-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent">
            My Profile
          </h1>
          <p className="text-gray-600 mt-2">Manage your business identity and information</p>
          
          {/* Status Badge */}
          <div className="inline-flex items-center mt-4 px-4 py-2 rounded-full bg-blue-100 text-blue-800">
            {vendor.isApproved ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-semibold">Approved Vendor</span>
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 mr-2" />
                <span className="font-semibold">Pending Approval</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Profile Header with Image */}
          <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="relative">
                <img
                  src={vendor.businessLogo}
                  alt="Business Logo"
                  className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-2xl"
                />
                <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full">
                  <Building className="w-5 h-5" />
                </div>
              </div>
              
              <div className="text-white flex-1 text-center md:text-left">
                <h2 className="text-3xl font-bold">{vendor.businessName || "Business Name"}</h2>
                <p className="text-blue-100 mt-2">
                  <User className="inline w-4 h-4 mr-1" />
                  {vendor.name}
                </p>
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    <span>{vendor.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{vendor.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    <span>Till: {vendor.tillNumber}</span>
                  </div>
                </div>
              </div>

              {/* Edit Button */}
              <div className="mt-4 md:mt-0">
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg"
                  >
                    <Edit2 className="w-5 h-5" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50"
                    >
                      {saving ? "Saving..." : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setUpdatedVendor(vendor);
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all"
                    >
                      <X className="w-5 h-5" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-6 md:p-10">
            {/* Personal Information */}
            <div className="mb-10">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <User className="w-6 h-6 mr-2 text-blue-600" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* First Name */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <label className="text-sm font-medium text-gray-600 flex items-center mb-2">
                    <User className="w-4 h-4 mr-1" />
                    First Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="firstName"
                      value={updatedVendor.firstName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  ) : (
                    <div className="text-lg font-semibold text-gray-800">{vendor.firstName}</div>
                  )}
                </div>

                {/* Last Name */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <label className="text-sm font-medium text-gray-600 flex items-center mb-2">
                    <User className="w-4 h-4 mr-1" />
                    Last Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="lastName"
                      value={updatedVendor.lastName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  ) : (
                    <div className="text-lg font-semibold text-gray-800">{vendor.lastName}</div>
                  )}
                </div>

                {/* Full Name */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <label className="text-sm font-medium text-gray-600 flex items-center mb-2">
                    <User className="w-4 h-4 mr-1" />
                    Full Name
                  </label>
                  <div className="text-lg font-semibold text-gray-800">{vendor.name}</div>
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div className="mb-10">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Building className="w-6 h-6 mr-2 text-blue-600" />
                Business Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Business Name */}
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                  <label className="text-sm font-medium text-gray-600 flex items-center mb-2">
                    <Building className="w-4 h-4 mr-1 text-blue-600" />
                    Business Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="businessName"
                      value={updatedVendor.businessName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  ) : (
                    <div className="text-lg font-semibold text-gray-800">{vendor.businessName}</div>
                  )}
                </div>

                {/* Till Number */}
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                  <label className="text-sm font-medium text-gray-600 flex items-center mb-2">
                    <FileText className="w-4 h-4 mr-1 text-blue-600" />
                    Tin Number
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="tillNumber"
                      value={updatedVendor.tillNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  ) : (
                    <div className="text-lg font-semibold text-gray-800">{vendor.tillNumber}</div>
                  )}
                </div>

                {/* Note */}
                <div className="md:col-span-2 bg-yellow-50 p-5 rounded-xl border border-yellow-200">
                  <label className="text-sm font-medium text-gray-600 flex items-center mb-2">
                    <FileText className="w-4 h-4 mr-1 text-yellow-600" />
                    Additional Notes
                  </label>
                  {editing ? (
                    <textarea
                      name="note"
                      value={updatedVendor.note || ""}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-4 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none resize-none"
                    />
                  ) : (
                    <div className="text-lg font-semibold text-gray-800">
                      {vendor.note || "No notes added"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="mb-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                  <MapPin className="w-6 h-6 mr-2 text-blue-600" />
                  Addresses
                </h3>
                
                {editing && (
                  <button
                    onClick={handleAddAddress}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add Address
                  </button>
                )}
              </div>
              
              <div className="space-y-6">
                {(editing ? updatedVendor.addresses : vendor.addresses).map((address, index) => (
                  <div key={address._id || `address-${index}`} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold text-blue-700 flex items-center">
                        <MapPin className="w-5 h-5 mr-2" />
                        Address {index + 1}
                      </span>
                      
                      {editing && (
                        <button
                          onClick={() => handleRemoveAddress(index)}
                          className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                          disabled={updatedVendor.addresses.length <= 1}
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Street */}
                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-1 block">Street</label>
                        {editing ? (
                          <input
                            type="text"
                            value={updatedVendor.addresses[index]?.street || ""}
                            onChange={(e) => handleAddressChange(index, 'street', e.target.value)}
                            className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                            placeholder="Enter street address"
                          />
                        ) : (
                          <div className="font-medium text-gray-800">{address.street}</div>
                        )}
                      </div>

                      {/* City */}
                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-1 block">City</label>
                        {editing ? (
                          <input
                            type="text"
                            value={updatedVendor.addresses[index]?.city || ""}
                            onChange={(e) => handleAddressChange(index, 'city', e.target.value)}
                            className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                            placeholder="Enter city"
                          />
                        ) : (
                          <div className="font-medium text-gray-800">{address.city}</div>
                        )}
                      </div>

                      {/* Zipcode */}
                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-1 block">Zip Code</label>
                        {editing ? (
                          <input
                            type="text"
                            value={updatedVendor.addresses[index]?.zipcode || ""}
                            onChange={(e) => handleAddressChange(index, 'zipcode', e.target.value)}
                            className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                            placeholder="Enter zip code"
                          />
                        ) : (
                          <div className="font-medium text-gray-800">{address.zipcode}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Location Coordinates */}
            <div className="mb-10">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Globe className="w-6 h-6 mr-2 text-blue-600" />
                Location Coordinates
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Latitude */}
                <div className="bg-green-50 p-5 rounded-xl border border-green-200">
                  <label className="text-sm font-medium text-gray-600 flex items-center mb-2">
                    <Map className="w-4 h-4 mr-1 text-green-600" />
                    Latitude
                  </label>
                  {editing ? (
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      value={updatedVendor.location?.coordinates[1] || ""}
                      onChange={(e) => {
                        const newCoords = [...(updatedVendor.location?.coordinates || [0, 0])];
                        newCoords[1] = parseFloat(e.target.value) || 0;
                        setUpdatedVendor({
                          ...updatedVendor,
                          location: {
                            ...updatedVendor.location,
                            coordinates: newCoords
                          }
                        });
                      }}
                      className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
                      placeholder="Enter latitude"
                    />
                  ) : (
                    <div className="text-lg font-semibold text-gray-800">
                      {vendor.location?.coordinates[1] || "Not set"}
                    </div>
                  )}
                </div>

                {/* Longitude */}
                <div className="bg-green-50 p-5 rounded-xl border border-green-200">
                  <label className="text-sm font-medium text-gray-600 flex items-center mb-2">
                    <Map className="w-4 h-4 mr-1 text-green-600" />
                    Longitude
                  </label>
                  {editing ? (
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={updatedVendor.location?.coordinates[0] || ""}
                      onChange={(e) => {
                        const newCoords = [...(updatedVendor.location?.coordinates || [0, 0])];
                        newCoords[0] = parseFloat(e.target.value) || 0;
                        setUpdatedVendor({
                          ...updatedVendor,
                          location: {
                            ...updatedVendor.location,
                            coordinates: newCoords
                          }
                        });
                      }}
                      className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
                      placeholder="Enter longitude"
                    />
                  ) : (
                    <div className="text-lg font-semibold text-gray-800">
                      {vendor.location?.coordinates[0] || "Not set"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <FileText className="w-6 h-6 mr-2 text-blue-600" />
                Account Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Created At */}
                <div className="bg-gray-100 p-5 rounded-xl border border-gray-300">
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Created On</label>
                  <div className="text-lg font-semibold text-gray-800">
                    {new Date(vendor.createdAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>

                {/* Last Updated */}
                <div className="bg-gray-100 p-5 rounded-xl border border-gray-300">
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Last Updated</label>
                  <div className="text-lg font-semibold text-gray-800">
                    {new Date(vendor.updatedAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>

                {/* Status */}
                <div className={`p-5 rounded-xl border ${
                  vendor.isApproved 
                    ? 'bg-green-100 border-green-300' 
                    : 'bg-yellow-100 border-yellow-300'
                }`}>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Account Status</label>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                    vendor.isApproved 
                      ? 'bg-green-200 text-green-800' 
                      : 'bg-yellow-200 text-yellow-800'
                  }`}>
                    {vendor.isApproved ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approved
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 mr-1" />
                        Pending Approval
                      </>
                    )}
                  </div>
                </div>

                {/* Vendor ID */}
                <div className="bg-gray-100 p-5 rounded-xl border border-gray-300">
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Vendor ID</label>
                  <div className="text-sm font-mono text-gray-700 truncate">
                    {vendor._id}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;