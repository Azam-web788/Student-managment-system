import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { showSnackbar } from '../redux/slices/uiSlice';
import api from '../services/api';

export default function StudentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    departmentId: '',
    courseId: '',
    status: 'active',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  useEffect(() => {
    loadDepartments();
    if (isEdit) {
      loadStudent();
    }
  }, [id]);

  const loadDepartments = async () => {
    try {
      const res = await api.getAllDepartments();
      setDepartments(res.data || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const loadCourses = async (departmentId) => {
    try {
      if (departmentId) {
        const res = await api.getCoursesByDepartment(departmentId);
        setCourses(res.data || []);
      } else {
        setCourses([]);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  const loadStudent = async () => {
    try {
      setLoading(true);
      const res = await api.getStudent(id);
      const student = res.data;
      setFormData({
        firstName: student.first_name || '',
        lastName: student.last_name || '',
        email: student.email || '',
        phone: student.phone || '',
        dateOfBirth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
        gender: student.gender || '',
        address: student.address || '',
        city: student.city || '',
        state: student.state || '',
        zipCode: student.zip_code || '',
        country: student.country || 'USA',
        departmentId: student.department_id || '',
        courseId: student.course_id || '',
        status: student.status || 'active',
        emergencyContactName: student.emergency_contact_name || '',
        emergencyContactPhone: student.emergency_contact_phone || '',
      });
      if (student.profile_image_url) {
        setPreviewUrl(student.profile_image_url);
      }
      if (student.department_id) {
        loadCourses(student.department_id);
      }
    } catch (err) {
      setError('Failed to load student');
      dispatch(showSnackbar({ message: 'Failed to load student', severity: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'departmentId') {
      setFormData((prev) => ({ ...prev, courseId: '' }));
      loadCourses(value);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        dispatch(showSnackbar({ message: 'File too large. Max 5MB.', severity: 'error' }));
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        dispatch(showSnackbar({ message: 'Invalid file type. Use JPEG, PNG, GIF, or WebP.', severity: 'error' }));
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formPayload = new FormData();
      formPayload.append('firstName', formData.firstName);
      formPayload.append('lastName', formData.lastName);
      formPayload.append('email', formData.email);
      formPayload.append('phone', formData.phone);
      formPayload.append('dateOfBirth', formData.dateOfBirth);
      formPayload.append('gender', formData.gender);
      formPayload.append('address', formData.address);
      formPayload.append('city', formData.city);
      formPayload.append('state', formData.state);
      formPayload.append('zipCode', formData.zipCode);
      formPayload.append('country', formData.country);
      formPayload.append('departmentId', formData.departmentId);
      formPayload.append('courseId', formData.courseId);
      formPayload.append('status', formData.status);
      formPayload.append('emergencyContactName', formData.emergencyContactName);
      formPayload.append('emergencyContactPhone', formData.emergencyContactPhone);

      if (selectedFile) {
        formPayload.append('profileImage', selectedFile);
      }

      if (isEdit) {
        await api.updateStudent(id, formPayload);
        dispatch(showSnackbar({ message: 'Student updated successfully', severity: 'success' }));
      } else {
        await api.createStudent(formPayload);
        dispatch(showSnackbar({ message: 'Student created successfully', severity: 'success' }));
      }
      navigate('/students');
    } catch (err) {
      setError(err.message || 'Failed to save student');
      dispatch(showSnackbar({ message: err.message || 'Failed to save student', severity: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/students')}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {isEdit ? 'Edit Student' : 'Add Student'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEdit ? 'Update student information' : 'Enter new student details'}
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Personal Information
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid xs={12} sm={6}>
                <TextField fullWidth label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField fullWidth label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField fullWidth label="Phone" name="phone" value={formData.phone} onChange={handleChange} />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField fullWidth label="Date of Birth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Gender</InputLabel>
                  <Select name="gender" value={formData.gender} label="Gender" onChange={handleChange}>
                    <MenuItem value="">Select Gender</MenuItem>
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Address
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid xs={12}>
                <TextField fullWidth label="Address" name="address" value={formData.address} onChange={handleChange} multiline rows={2} />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField fullWidth label="City" name="city" value={formData.city} onChange={handleChange} />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField fullWidth label="State" name="state" value={formData.state} onChange={handleChange} />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField fullWidth label="ZIP Code" name="zipCode" value={formData.zipCode} onChange={handleChange} />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField fullWidth label="Country" name="country" value={formData.country} onChange={handleChange} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Academic Information
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Department</InputLabel>
                  <Select name="departmentId" value={formData.departmentId} label="Department" onChange={handleChange}>
                    <MenuItem value="">Select Department</MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>{dept.name} ({dept.code})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Course</InputLabel>
                  <Select name="courseId" value={formData.courseId} label="Course" onChange={handleChange} disabled={!formData.departmentId}>
                    <MenuItem value="">Select Course</MenuItem>
                    {courses.map((course) => (
                      <MenuItem key={course.id} value={course.id}>{course.name} ({course.code})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select name="status" value={formData.status} label="Status" onChange={handleChange}>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="graduated">Graduated</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Emergency Contact
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid xs={12} sm={6}>
                <TextField fullWidth label="Contact Name" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField fullWidth label="Contact Phone" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Profile Image
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mt: 1 }}>
              <Avatar
                src={previewUrl}
                sx={{ width: 100, height: 100, bgcolor: 'primary.light', fontSize: '2rem' }}
              >
                {formData.firstName?.[0]}{formData.lastName?.[0]}
              </Avatar>
              <Button
                variant="outlined"
                component="label"
                startIcon={<PhotoCameraIcon />}
              >
                Upload Photo
                <input type="file" hidden accept="image/*" onChange={handleFileSelect} />
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={() => navigate('/students')} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={saving}
          >
            {saving ? 'Saving...' : isEdit ? 'Update Student' : 'Create Student'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
