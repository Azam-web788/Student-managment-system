import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { setUser } from '../redux/slices/authSlice';
import api from '../services/api';

export default function StudentProfileEdit() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const fileInputRef = useRef(null);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Max 5MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setError('Invalid file type. Use JPEG, PNG, GIF, or WebP.');
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    uploadImage(file);
  };

  const uploadImage = async (file) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('profileImage', file);
      const res = await api.uploadProfileImage(formData);
      setProfileImageUrl(res.data.profileImageUrl);
    } catch (err) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await api.updateProfile({ fullName: fullName.trim() });
      dispatch(setUser(res.data.user));
      setSuccess(true);
      setTimeout(() => navigate('/student/dashboard'), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/student/dashboard')}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" fontWeight={700}>Edit Profile</Typography>
          <Typography variant="body2" color="text.secondary">Update your account information</Typography>
        </Box>
      </Box>

      <Card sx={{ maxWidth: 600 }}>
        <CardContent sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              Profile updated successfully! Redirecting...
            </Alert>
          )}

          {/* Profile Picture Section */}
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Profile Picture
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <Avatar
              src={previewUrl || profileImageUrl}
              sx={{
                width: 100,
                height: 100,
                bgcolor: 'primary.light',
                fontSize: '2rem',
                border: '3px solid',
                borderColor: 'divider',
              }}
            >
              {user?.fullName?.[0] || '?'}
            </Avatar>
            <Box>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageSelect}
              />
              <Button
                variant="outlined"
                startIcon={uploading ? <CircularProgress size={18} /> : <PhotoCameraIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                sx={{ borderRadius: 2 }}
              >
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </Button>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Max 5MB. JPEG, PNG, GIF, WebP
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Profile Info Section */}
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Account Information
          </Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              value={user?.email || ''}
              disabled
              margin="normal"
              helperText="Email cannot be changed"
            />
            <TextField
              fullWidth
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              margin="normal"
              autoFocus
            />
            <TextField
              fullWidth
              label="Role"
              value={user?.role || ''}
              disabled
              margin="normal"
              sx={{ textTransform: 'capitalize' }}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/student/dashboard')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
