// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CameraService } from '../../services/capacitorService';

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const [profile, setProfile] = useState(user);
  const [isEditing, setIsEditing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl);

  const handleChangePhoto = async () => {
    try {
      const base64 = await CameraService.takePicture();
      setPhotoUrl(`data:image/jpeg;base64,${base64}`);
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile(profile);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <h2>👤 Profile</h2>

      {profile && (
        <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            {photoUrl && (
              <img
                src={photoUrl}
                alt="Profile"
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  marginBottom: '12px',
                }}
              />
            )}
            <button onClick={handleChangePhoto} className="btn btn-secondary">
              Change Photo
            </button>
          </div>

          {isEditing ? (
            <>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Name"
                className="input"
              />
              <input
                type="email"
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="Email"
                className="input"
              />
              <button onClick={handleSaveProfile} className="btn btn-primary">
                Save
              </button>
              <button onClick={() => setIsEditing(false)} className="btn btn-secondary">
                Cancel
              </button>
            </>
          ) : (
            <>
              <p>
                <strong>Name:</strong> {profile.name}
              </p>
              <p>
                <strong>Phone:</strong> {profile.phone}
              </p>
              <p>
                <strong>Email:</strong> {profile.email || 'Not set'}
              </p>
              <button onClick={() => setIsEditing(true)} className="btn btn-primary">
                Edit Profile
              </button>
            </>
          )}

          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ marginTop: '20px', width: '100%' }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
