// src/components/InstituteProfile.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;

export default function InstituteProfile() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);

  // fetch institute profile
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
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Institute Profile</h1>
        <button
          onClick={() => setEditing(s => !s)}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {editing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      <div className="p-4 border rounded shadow-sm mb-6">
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
    </div>
  );
}
