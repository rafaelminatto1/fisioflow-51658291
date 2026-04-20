import React from 'react';
import { motion } from 'framer-motion';

export const ScribeWaveform: React.FC<{ isRecording: boolean }> = ({ isRecording }) => {
  const bars = Array.from({ length: 20 });
  
  return (
    <div className="flex items-center justify-center gap-1 h-12 w-full">
      {bars.map((_, i) => (
        <motion.div
          key={i}
          className="w-1.5 bg-violet-500 rounded-full"
          animate={isRecording ? {
            height: [10, Math.random() * 40 + 10, 10],
          } : { height: 4 }}
          transition={isRecording ? {
            repeat: Infinity,
            duration: 0.5 + Math.random() * 0.5,
            ease: "easeInOut"
          } : { duration: 0.3 }}
        />
      ))}
    </div>
  );
};
