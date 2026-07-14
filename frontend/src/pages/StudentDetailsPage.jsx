import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import CakeIcon from '@mui/icons-material/Cake';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SchoolIcon from '@mui/icons-material/School';
import BadgeIcon from '@mui/icons-material/Badge';
import api from '../services/api';
import { showSnackbar, showConfirmDialog } from '../redux/slices/uiSlice';

const InfoRow = ({ icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
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

export default function StudentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    loadStudent();
  }, [id]);

  const loadStudent = async () => {
    try {
      setLoading(true);
      setAvatarError(false); // reset for new student
      const res = await api.getStudent(id);
      setStudent(res.data);
    } catch (err) {
      dispatch(showSnackbar({ message: 'Failed to load student', severity: 'error' }));
      navigate('/students');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    dispatch(showConfirmDialog({
      title: 'Delete Student',
      message: `Are you sure you want to delete ${student?.first_name} ${student?.last_name}?`,
      onConfirm: async () => {
        try {
          await api.deleteStudent(id);
          dispatch(showSnackbar({ message: 'Student deleted successfully', severity: 'success' }));
          navigate('/students');
        } catch (err) {
          dispatch(showSnackbar({ message: 'Failed to delete student', severity: 'error' }));
        }
      },
    }));
  };

  const getStatusColor = (status) => {
    const colors = { active: 'success', inactive: 'warning', graduated: 'info', suspended: 'error' };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (!student) return null;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/students')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight={700}>
            {student.first_name} {student.last_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {student.student_id}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/students/${id}/edit`)}>
            Edit
          </Button>
          <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>
            Delete
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ textAlign: 'center' }}>
            <CardContent sx={{ p: 3 }}>
              <Avatar
                src={avatarError ? undefined : student.profile_image_url}
                imgProps={{ onError: () => setAvatarError(true) }}
                sx={{
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  mb: 2,
                  bgcolor: 'primary.light',
                  fontSize: '2.5rem',
                  border: '4px solid',
                  borderColor: 'primary.main',
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
                sx={{ mt: 1 }}
              />
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary" display="block">
                Enrolled: {new Date(student.enrollment_date).toLocaleDateString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Created: {new Date(student.created_at).toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Details Card */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Personal Details
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Grid container spacing={0}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow icon={<EmailIcon fontSize="small" />} label="Email" value={student.email} />
                  <InfoRow icon={<PhoneIcon fontSize="small" />} label="Phone" value={student.phone} />
                  <InfoRow icon={<CakeIcon fontSize="small" />} label="Date of Birth" value={student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : '-'} />
                  <InfoRow icon={<BadgeIcon fontSize="small" />} label="Gender" value={student.gender} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow icon={<SchoolIcon fontSize="small" />} label="Department" value={student.department_name} />
                  <InfoRow icon={<SchoolIcon fontSize="small" />} label="Course" value={student.course_name} />
                  <InfoRow icon={<LocationOnIcon fontSize="small" />} label="Location" value={[student.city, student.state].filter(Boolean).join(', ') || '-'} />
                  <InfoRow icon={<PhoneIcon fontSize="small" />} label="Emergency Contact" value={student.emergency_contact_name} />
                </Grid>
              </Grid>

              {student.address && (
                <>
                  <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
                    Address
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {student.address}
                    {student.city && `, ${student.city}`}
                    {student.state && `, ${student.state}`}
                    {student.zip_code && ` - ${student.zip_code}`}
                  </Typography>
                </>
              )}

              {student.emergency_contact_phone && (
                <>
                  <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
                    Emergency Contact
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {student.emergency_contact_name} - {student.emergency_contact_phone}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
