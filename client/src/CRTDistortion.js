import React from 'react';

const CRTDistortion = () => (
  <svg style={{ width: 0, height: 0, position: 'absolute', overflow: 'hidden' }}>
    <defs>
      <filter id="crt-warp" x="0" y="0" width="100%" height="100%">
        {/* 
          Construct a displacement map:
          - Red channel (0-255) controls X displacement (Left to Right)
          - Green channel (0-255) controls Y displacement (Top to Bottom)
          - We use mix-blend-mode: screen to combine them.
        */}
        <feImage 
          href="data:image/svg+xml,%3Csvg viewBox='0 0 512 512' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='gx' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0' stop-color='%23000000'/%3E%3Cstop offset='1' stop-color='%23ff0000'/%3E%3C/linearGradient%3E%3ClinearGradient id='gy' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23000000'/%3E%3Cstop offset='1' stop-color='%2300ff00'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23gx)' style='mix-blend-mode: screen;'/%3E%3Crect width='100%25' height='100%25' fill='url(%23gy)' style='mix-blend-mode: screen;'/%3E%3C/svg%3E" 
          result="displacement-map"
        />
        <feDisplacementMap 
          in="SourceGraphic" 
          in2="displacement-map" 
          scale="-15" 
          xChannelSelector="R" 
          yChannelSelector="G"
        />
      </filter>
    </defs>
  </svg>
);

export default CRTDistortion;