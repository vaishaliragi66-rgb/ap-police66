import React, { useEffect, useState } from "react";

const Profile_manu = () => {
  const [manufacturer, setManufacturer] = useState(null);

  useEffect(() => {
    const storedData = localStorage.getItem("manufacturer");

    if (!storedData || storedData === "undefined") {
      alert("⚠️ No manufacturer data found. Please log in again.");
      window.location.href = "/manufacturer-login";
      return;
    }

    try {
      const parsed = JSON.parse(storedData);
      const manu = parsed.manufacturer ? parsed.manufacturer : parsed;
      setManufacturer(manu);
    } catch (error) {
      console.error("Error parsing manufacturer data:", error);
      localStorage.removeItem("manufacturer");
      alert("⚠️ Invalid session. Please log in again.");
      window.location.href = "/manufacturer-login";
    }
  }, []);

  if (!manufacturer) {
    return <div className="text-center text-gray-500 mt-10">Loading profile...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg p-6 mt-6">
      <h2 className="text-2xl font-semibold text-center mb-4">
        Manufacturer Profile
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <p><strong>Name:</strong> {manufacturer.Manufacturer_Name}</p>
        <p><strong>Email:</strong> {manufacturer.Email_ID}</p>
        <p><strong>Contact No:</strong> {manufacturer.Contact_No}</p>
        <p><strong>ID:</strong> {manufacturer._id}</p>

        <div className="col-span-2 mt-2">
          <h3 className="font-semibold text-lg mb-2">Address</h3>
          <p>{manufacturer.Address?.Street}</p>
          <p>{manufacturer.Address?.District}, {manufacturer.Address?.State}</p>
          <p>Pincode: {manufacturer.Address?.Pincode}</p>
        </div>
      </div>

      {manufacturer.Orders && manufacturer.Orders.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-2">Orders</h3>
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Medicine ID</th>
                <th className="border p-2">Institute ID</th>
                <th className="border p-2">Quantity</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {manufacturer.Orders.map((order, i) => (
                <tr key={i} className="text-center">
                  <td className="border p-2">{order.Medicine_ID || "N/A"}</td>
                  <td className="border p-2">{order.Institute_ID || "N/A"}</td>
                  <td className="border p-2">{order.Quantity}</td>
                  <td className="border p-2">{order.Delivery_Status}</td>
                  <td className="border p-2">{order.Remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Profile_manu;