// src/components/InstituteProfile.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT 

export default function InstituteProfile() {
  const [profile, setProfile] = useState(null);
  const [inventorySummary, setInventorySummary] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);

  // get institute id from localStorage (as your app stores it)
  useEffect(() => {
    const stored = localStorage.getItem('institute');
    if (!stored) {
      setLoading(false);
      return;
    }
    const institute = JSON.parse(stored);
    const id = institute._id;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`http://localhost:${BACKEND_PORT_NO}/institute-api/profile/${id}`);
        setProfile(res.data.profile);
        setInventorySummary(res.data.inventorySummary);
        setRecentOrders(res.data.recentOrders || []);
        setForm({
          Institute_Name: res.data.profile.Institute_Name || '',
          Email_ID: res.data.profile.Email_ID || '',
          Contact_No: res.data.profile.Contact_No || '',
          Address: res.data.profile.Address || {}
        });
      } catch (err) {
        console.error('Error fetching profile', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (key, value) => {
    if (key.startsWith('address.')) {
      const addrKey = key.split('.')[1];
      setForm(prev => ({ ...prev, Address: { ...(prev.Address || {}), [addrKey]: value } }));
    } else {
      setForm(prev => ({ ...prev, [key]: value }));
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    const stored = localStorage.getItem('institute');
    if (!stored) return alert('No institute logged in');
    const id = JSON.parse(stored)._id;

    const payload = {
      Institute_Name: form.Institute_Name,
      Email_ID: form.Email_ID,
      Contact_No: form.Contact_No,
      Address: form.Address
    };

    try {
      const res = await axios.put(`http://localhost:${BACKEND_PORT_NO}/institute-api/profile/${id}`, payload);
      setProfile(res.data.profile);
      setEditing(false);
      alert('Profile updated');
    } catch (err) {
      console.error('Error updating profile', err);
      alert('Update failed: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!profile) return <div className="p-6">No institute profile available. Please login.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Institute Profile</h1>
        <div>
          <button onClick={() => setEditing(s => !s)} className="px-4 py-2 bg-blue-600 text-white rounded">
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 p-4 border rounded shadow-sm">
          <h2 className="text-lg font-semibold mb-2">{profile.Institute_Name}</h2>
          <p className="text-sm text-gray-600 mb-1"><strong>Email:</strong> {profile.Email_ID}</p>
          <p className="text-sm text-gray-600 mb-1"><strong>Contact:</strong> {profile.Contact_No || '—'}</p>

          <div className="mt-3">
            <h3 className="font-medium">Address</h3>
            <p className="text-sm">
              {profile.Address?.Street || '—'}, {profile.Address?.District || '—'}, {profile.Address?.State || '—'} - {profile.Address?.Pincode || '—'}
            </p>
          </div>
        </div>

        <div className="p-4 border rounded shadow-sm">
          <h3 className="text-lg font-semibold">Inventory Summary</h3>
          <div className="mt-3">
            <p><strong>Total distinct medicines:</strong> {inventorySummary?.totalDistinct ?? 0}</p>
            <p><strong>Total quantity:</strong> {inventorySummary?.totalQuantity ?? 0}</p>
            <p><strong>Low stock count:</strong> {inventorySummary?.lowStockCount ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <form onSubmit={submitEdit} className="mb-6 p-4 border rounded">
          <h3 className="font-semibold mb-2">Edit Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Institute Name</label>
              <input value={form.Institute_Name || ''} onChange={e => handleChange('Institute_Name', e.target.value)} className="w-full p-2 border rounded"/>
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input value={form.Email_ID || ''} onChange={e => handleChange('Email_ID', e.target.value)} className="w-full p-2 border rounded"/>
            </div>
            <div>
              <label className="block text-sm font-medium">Contact No</label>
              <input value={form.Contact_No || ''} onChange={e => handleChange('Contact_No', e.target.value)} className="w-full p-2 border rounded"/>
            </div>
            <div>
              <label className="block text-sm font-medium">Pincode</label>
              <input value={form.Address?.Pincode || ''} onChange={e => handleChange('address.Pincode', e.target.value)} className="w-full p-2 border rounded"/>
            </div>

            <div>
              <label className="block text-sm font-medium">Street</label>
              <input value={form.Address?.Street || ''} onChange={e => handleChange('address.Street', e.target.value)} className="w-full p-2 border rounded"/>
            </div>
            <div>
              <label className="block text-sm font-medium">District</label>
              <input value={form.Address?.District || ''} onChange={e => handleChange('address.District', e.target.value)} className="w-full p-2 border rounded"/>
            </div>
            <div>
              <label className="block text-sm font-medium">State</label>
              <input value={form.Address?.State || ''} onChange={e => handleChange('address.State', e.target.value)} className="w-full p-2 border rounded"/>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 border rounded">Cancel</button>
          </div>
        </form>
      )}

      {/* Inventory table */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Medicine Inventory</h3>
        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">S.No</th>
                <th className="p-2 border">Medicine</th>
                <th className="p-2 border">Quantity</th>
                <th className="p-2 border">Threshold</th>
                <th className="p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {profile.Medicine_Inventory && profile.Medicine_Inventory.length > 0 ? (
                profile.Medicine_Inventory.map((it, idx) => {
                  const name = it.Medicine_ID?.Medicine_Name || 'Unknown';
                  const threshold = it.Medicine_ID?.Threshold_Qty ?? '—';
                  const qty = it.Quantity ?? 0;
                  const isLow = typeof threshold === 'number' ? qty < threshold : false;
                  return (
                    <tr key={idx} className="text-center">
                      <td className="p-2 border">{idx+1}</td>
                      <td className="p-2 border">{name}</td>
                      <td className="p-2 border">{qty}</td>
                      <td className="p-2 border">{threshold}</td>
                      <td className={`p-2 border font-semibold ${isLow ? 'text-red-600' : 'text-green-600'}`}>
                        {isLow ? 'LOW' : 'OK'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="5" className="p-3 text-center text-gray-600">No inventory data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Recent Orders</h3>
        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">S.No</th>
                <th className="p-2 border">Medicine</th>
                <th className="p-2 border">Manufacturer</th>
                <th className="p-2 border">Quantity</th>
                <th className="p-2 border">Order Date</th>
                <th className="p-2 border">Delivery Date</th>
                <th className="p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 && <tr><td colSpan="7" className="p-3 text-center text-gray-600">No recent orders</td></tr>}
              {recentOrders.map((o, idx) => (
                <tr key={idx} className="text-center">
                  <td className="p-2 border">{idx+1}</td>
                  <td className="p-2 border">{o.Medicine_ID?.Medicine_Name || 'N/A'}</td>
                  <td className="p-2 border">{o.Manufacturer_ID?.Manufacturer_Name || 'N/A'}</td>
                  <td className="p-2 border">{o.Quantity_Requested}</td>
                  <td className="p-2 border">{new Date(o.Order_Date).toLocaleDateString()}</td>
                  <td className="p-2 border">{o.Delivery_Date ? new Date(o.Delivery_Date).toLocaleDateString() : '—'}</td>
                  <td className="p-2 border">{o.Status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}