import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vinext automatically handles Next.js specific plugins (like RSC).
// This config is kept minimal just to satisfy any manual Vite overrides if needed.
export default defineConfig({
  plugins: [react()],
})
