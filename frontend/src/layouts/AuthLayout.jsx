import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import SchoolIcon from '@mui/icons-material/School';

export default function AuthLayout({ children }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1976D2 0%, #7C4DFF 50%, #1565C0 100%)',
        p: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 440,
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #1976D2, #7C4DFF)',
          },
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <SchoolIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" fontWeight={700} color="primary.main">
            Student Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to manage your students
          </Typography>
        </Box>
        {children}
      </Paper>
    </Box>
  );
}
