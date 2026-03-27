'use client';

import { Box } from '@mui/material';
import Navbar from '@/components/Navbar';
import Hero from '@/components/sections/Hero';
import WizardSection from '@/components/sections/WizardSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <Box>
      <Navbar />
      <Hero />
      <WizardSection />
      <Footer />
    </Box>
  );
}
