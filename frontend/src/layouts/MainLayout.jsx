import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';

const DRAWER_WIDTH = 280;

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleMobileToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        open={sidebarOpen}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onToggle={handleToggleSidebar}
      />

      <Box
        sx={{
          flexGrow: 1,
          ml: { md: sidebarOpen ? `${DRAWER_WIDTH}px` : '0px' },
          transition: 'margin-left 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <Navbar onMenuClick={handleMobileToggle} sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
