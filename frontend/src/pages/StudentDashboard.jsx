import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import EditIcon from '@mui/icons-material/Edit';
import SchoolIcon from '@mui/icons-material/School';
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import CakeIcon from '@mui/icons-material/Cake';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BookIcon from '@mui/icons-material/Book';
import BusinessIcon from '@mui/icons-material/Business';
import api from '../services/api';

const InfoRow = ({ icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
    <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={500}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value || '-'}
      </Typography>
    </Box>
  </Box>
);

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      fetchStudentData(user.email);
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchStudentData = async (email) => {
    try {
      const res = await api.getStudents({ search: email, limit: 1 });
      if (res.data && res.data.length > 0) {
        setStudent(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = { active: 'success', inactive: 'warning', graduated: 'info', suspended: 'error' };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Welcome Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} color="text.primary">
          Welcome, {user?.fullName?.split(' ')[0] || 'Student'}!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {student ? 'Your student profile overview' : 'Student Management System'}
        </Typography>
      </Box>

      {student ? (
        <Grid container spacing={3}>
          {/* Profile Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ textAlign: 'center' }}>
              <CardContent sx={{ p: 3, position: 'relative' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => navigate('/student/profile/edit')}
                  sx={{ position: 'absolute', top: 12, right: 12, borderRadius: 2 }}
                >
                  Edit
                </Button>
                <Avatar
                  src={student.profile_image_url}
                  sx={{
                    width: 120,
                    height: 120,
                    mx: 'auto',
                    mb: 2,
                    bgcolor: 'success.main',
                    fontSize: '2.5rem',
                    border: '4px solid',
                    borderColor: 'success.main',
                  }}
                >
                  {student.first_name?.[0]}{student.last_name?.[0]}
                </Avatar>
                <Typography variant="h6" fontWeight={700}>
                  {student.first_name} {student.last_name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {student.student_id}
                </Typography>
                <Chip
                  label={student.status}
                  color={getStatusColor(student.status)}
                  size="small"
                  sx={{ mt: 1, textTransform: 'capitalize' }}
                />
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary" display="block">
                  Enrolled: {new Date(student.enrollment_date).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Details Card */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Personal Details
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Grid container spacing={0}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <InfoRow icon={<EmailIcon fontSize="small" />} label="Email" value={student.email} />
                    <InfoRow icon={<PhoneIcon fontSize="small" />} label="Phone" value={student.phone} />
                    <InfoRow icon={<CakeIcon fontSize="small" />} label="Date of Birth" value={student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : '-'} />
                    <InfoRow icon={<BadgeIcon fontSize="small" />} label="Gender" value={student.gender} />
                    <InfoRow icon={<BadgeIcon fontSize="small" />} label="Student ID" value={student.student_id} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <InfoRow icon={<BusinessIcon fontSize="small" />} label="Department" value={student.department_name} />
                    <InfoRow icon={<BookIcon fontSize="small" />} label="Course" value={student.course_name} />
                    <InfoRow icon={<LocationOnIcon fontSize="small" />} label="Location" value={[student.city, student.state].filter(Boolean).join(', ') || '-'} />
                    <InfoRow icon={<PhoneIcon fontSize="small" />} label="Emergency Contact" value={student.emergency_contact_name} />
                  </Grid>
                </Grid>

                {student.address && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Address
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {student.address}
                      {student.city && `, ${student.city}`}
                      {student.state && `, ${student.state}`}
                      {student.zip_code && ` - ${student.zip_code}`}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <SchoolIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h5" fontWeight={600} color="text.secondary" gutterBottom>
              No Student Profile Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
              Your student profile could not be found. Please contact the system administrator if you believe this is an error.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
