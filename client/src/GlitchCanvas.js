import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';

const GlitchCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let frameCount = 0;

    // Timing state for random glitch bursts
    let lastGlitchTime = 0;
    let glitchEndTime = 0;
    let nextGlitchDelay = 2000; // First glitch happens sooner

    // Configuration for the glitch chaos
    const config = {
      text: "NO SIGNAL",
      font: "bold 24px 'VT323', monospace",
      glitchIntensity: 0.15, // 0 to 1
      colorList: ['#0f0', '#00f', '#f00', '#ff00ff', '#00ffff'] // Cyberpunk palette
    };

    const resizeCanvas = () => {
      // Make canvas match the parent Box size
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    // Initial Resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const draw = (timestamp) => {
      if (!timestamp) timestamp = performance.now();

      const w = canvas.width;
      const h = canvas.height;
      frameCount++;

      // Determine Glitch State
      if (timestamp > lastGlitchTime + nextGlitchDelay) {
        lastGlitchTime = timestamp;
        const duration = 200 + Math.random() * 600; // 0.2s - 0.8s duration
        glitchEndTime = timestamp + duration;
        nextGlitchDelay = 4000 + Math.random() * 3000; // 4s - 7s interval
      }

      const isGlitching = timestamp < glitchEndTime;

      // 1. Clear Screen with slight opacity for "trails" (optional)
      // darker fill = shorter trails. 
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; 
      ctx.fillRect(0, 0, w, h);

      // 2. Randomly "Refresh" the Text (Simulate flickering signal)
      ctx.font = config.font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (!isGlitching) {
        // Stable State
        ctx.fillStyle = '#0f0';
        ctx.globalAlpha = 0.8 + Math.random() * 0.2; // Subtle flicker
        ctx.fillText(config.text, w / 2, h / 2);
        ctx.globalAlpha = 1.0;
      } else {
        // Glitch State
        if (Math.random() > 0.05) {
          ctx.fillStyle = '#0f0'; 
          const shakeX = (Math.random() - 0.5) * 10;
          const shakeY = (Math.random() - 0.5) * 10;
          ctx.fillText(config.text, w / 2 + shakeX, h / 2 + shakeY);
        }
      }

      // 3. Render "Block" Artifacts (The colorful digital noise)
      if (isGlitching && Math.random() < config.glitchIntensity) {
        const blockCount = Math.floor(Math.random() * 5);
        for (let i = 0; i < blockCount; i++) {
          ctx.fillStyle = config.colorList[Math.floor(Math.random() * config.colorList.length)];
          const blockX = Math.random() * w;
          const blockY = Math.random() * h;
          const blockW = Math.random() * 100 + 20;
          const blockH = Math.random() * 50 + 2;
          ctx.fillRect(blockX, blockY, blockW, blockH);
        }
      }

      // 4. The "Slicing" Effect (Real Tearing)
      // This grabs a horizontal strip of the canvas and moves it left/right
      const sliceCount = 3; 
      if (isGlitching) for (let i = 0; i < sliceCount; i++) {
        // Pick a random horizontal slice
        const sliceY = Math.random() * h;
        const sliceHeight = Math.random() * 50; // Height of the tear
        const offset = (Math.random() - 0.5) * (w * 0.2); // Shift amount

        // Copy that slice and paste it shifted
        ctx.drawImage(
          canvas, 
          0, sliceY, w, sliceHeight, // Source
          offset, sliceY, w, sliceHeight // Destination
        );
      }

      // 5. Scanlines (Optional, adds texture)
      if (frameCount % 2 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for (let y = 0; y < h; y += 4) {
          ctx.fillRect(0, y, w, 2);
        }
      }

      // 6. White Noise (Added)
      const noiseCount = (w * h) * 0.05;
      ctx.fillStyle = isGlitching ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)';
      for (let i = 0; i < noiseCount; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <Box sx={{ width: '100%', height: '100%', bgcolor: 'black' }}>
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', display: 'block' }} 
      />
    </Box>
  );
};

export default GlitchCanvas;