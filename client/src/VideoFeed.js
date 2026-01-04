import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Box, Slider, Typography } from '@mui/material';
import GlitchCanvas from './GlitchCanvas';
import CRTDistortion from './CRTDistortion';

const VideoFeed = ({ videoRef, stream, isMuted = false }) => {
  const [volume, setVolume] = useState(1);
  const internalRef = useRef(null);
  const ref = videoRef || internalRef;

  const randomOffset = useMemo(() => Math.random(), []);
  // Randomize animation start times so multiple feeds don't look identical
  const flickerDelay = useMemo(() => `-${randomOffset}s`, [randomOffset]);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream, ref]);

  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue);
    if (ref.current) {
      ref.current.volume = newValue;
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
    <CRTDistortion />
    <Box sx={{ 
      position: 'relative', 
      width: '33%', 
      aspectRatio: '4/3', 
      borderRadius: '20px', 
      backgroundColor: '#000',
      boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
      overflow: 'hidden' 
    }}>
      {/* Inner Screen Container with Barrel Distortion */}
      <Box sx={{ width: '100%', height: '100%', filter: 'url(#crt-warp)', transform: 'scale(1.05)' }}>
      {/* Static Background & No Signal Text */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        <GlitchCanvas />
      </Box>
      {/* Video Element */}
      <Box
        component="video"
        playsInline
        muted={isMuted}
        ref={ref}
        autoPlay
        sx={{ 
          position: 'relative', width: '100%', height: '100%', 
          zIndex: 1, objectFit: 'cover', minHeight: '200px'
        }}
      />
      {/* CRT Overlay (Vignette, Scanlines, Flicker) */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 2,
        pointerEvents: 'none',
        boxShadow: 'inset 4px 4px 10px rgba(0,0,0,0.9), inset -2px -2px 5px rgba(255,255,255,0.1), inset 0 0 80px rgba(0,0,0,0.8)',
        background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
        backgroundSize: '100% 2px, 3px 100%',
        animation: 'crt-flicker 0.1s infinite',
        animationDelay: flickerDelay
      }} />
      </Box>
    </Box>

    {/* Volume Control */}
    <Box sx={{ height: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Slider
        orientation="vertical"
        value={volume}
        min={0}
        max={1}
        step={0.05}
        onChange={handleVolumeChange}
        sx={{
          color: 'var(--theme-accent)',
          '& .MuiSlider-thumb': {
            width: 12,
            height: 12,
            borderRadius: 0, // Square thumb for matrix feel
            backgroundColor: 'var(--theme-accent)',
            '&:hover, &.Mui-focusVisible': {
              boxShadow: '0 0 0 8px rgba(0, 255, 65, 0.16)',
            },
          },
          '& .MuiSlider-rail': {
            color: 'var(--theme-secondary)',
            opacity: 0.5,
          },
        }}
      />
      <Typography variant="caption" sx={{ fontFamily: 'var(--theme-font)', color: 'var(--theme-accent)', mt: 1 }}>
        VOL
      </Typography>
    </Box>
    </Box>
  );
};

export default VideoFeed;