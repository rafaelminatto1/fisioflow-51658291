#!/usr/bin/env node
/**
 * Script para gerar ícones PNG para os apps
 * npm install sharp
 * node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import fs from 'fs';

// SVG do ícone Patient App (Teal)
const patientIconSvg = Buffer.from(`
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0D9488"/>
      <stop offset="100%" style="stop-color:#0F766E"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="224" fill="url(#bgGrad)"/>
  <g transform="translate(200, 200) scale(0.6)">
    <path fill="#FFFFFF" d="M520 200c-176.7 0-320 143.3-320 320s143.3 320 320 320 320-143.3 320-320-143.3-320-320-320zm0 580c-143.3 0-260-116.7-260-260s116.7-260 260-260 260 116.7 260 260-116.7 260-260 260z"/>
    <path fill="#FFFFFF" d="M520 360c-88.4 0-160 71.6-160 160s71.6 160 160 160 160-71.6 160-160-71.6-160-160-160zm0 260c-55.2 0-100-44.8-100-100s44.8-100 100-100 100 44.8 100 100-44.8 100-100 100z"/>
    <circle cx="520" cy="520" r="60" fill="#FFFFFF"/>
  </g>
</svg>
`);

// SVG do ícone Professional App (Blue)
const professionalIconSvg = Buffer.from(`
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1E40AF"/>
      <stop offset="100%" style="stop-color:#1E3A8A"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="224" fill="url(#bgGrad)"/>
  <g transform="translate(200, 200) scale(0.6)">
    <path fill="#FFFFFF" d="M520 200c-176.7 0-320 143.3-320 320s143.3 320 320 320 320-143.3 320-320-143.3-320-320-320zm0 580c-143.3 0-260-116.7-260-260s116.7-260 260-260 260 116.7 260 260-116.7 260-260 260z"/>
    <path fill="#FFFFFF" d="M480 340l-80 60 80 60v-60h80v-60h-80v-60zm80 120l80-60-80-60v60h-80v60h80v60z"/>
    <circle cx="520" cy="520" r="40" fill="#FFFFFF" opacity="0.3"/>
  </g>
</svg>
`);

// Ícone de notificação (monocromático para Android)
const notificationIconSvg = Buffer.from(`
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" rx="64" fill="#0D9488"/>
  <g transform="translate(50, 50) scale(0.15)">
    <circle cx="520" cy="520" r="200" fill="#FFFFFF"/>
    <circle cx="520" cy="520" r="120" fill="#0D9488"/>
    <circle cx="520" cy="520" r="60" fill="#FFFFFF"/>
  </g>
</svg>
`);

// Favicon
const faviconSvg = Buffer.from(`
<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="10" fill="#0D9488"/>
  <circle cx="24" cy="24" r="8" fill="#FFFFFF"/>
</svg>
`);

// Adaptive icon foreground
const adaptiveIconSvg = Buffer.from(`
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(200, 200) scale(0.6)">
    <path fill="#FFFFFF" d="M520 200c-176.7 0-320 143.3-320 320s143.3 320 320 320 320-143.3 320-320-143.3-320-320-320zm0 580c-143.3 0-260-116.7-260-260s116.7-260 260-260 260 116.7 260 260-116.7 260-260 260z"/>
    <path fill="#FFFFFF" d="M520 360c-88.4 0-160 71.6-160 160s71.6 160 160 160 160-71.6 160-160-71.6-160-160-160zm0 260c-55.2 0-100-44.8-100-100s44.8-100 100-100 100 44.8 100 100-44.8 100-100 100z"/>
    <circle cx="520" cy="520" r="60" fill="#FFFFFF"/>
  </g>
</svg>
`);

async function generateIcon(svg, outputPath, width, height) {
  try {
    await sharp(svg, { density: 300 })
      .resize(width, height, { fit: 'cover' })
      .png()
      .toFile(outputPath);
    console.log(`✓ Generated ${outputPath} (${width}x${height})`);
  } catch (error) {
    console.error(`✗ Error generating ${outputPath}:`, error.message);
  }
}

async function generateAll() {
  console.log('🎨 Generating app icons...\n');

  // Patient App Icons
  console.log('Patient App:');
  await generateIcon(patientIconSvg, 'patient-app/assets/icon.png', 1024, 1024);
  await generateIcon(patientIconSvg, 'patient-app/assets/favicon.png', 48, 48);
  await generateIcon(patientIconSvg, 'patient-app/assets/notification-icon.png', 96, 96);
  await generateIcon(adaptiveIconSvg, 'patient-app/assets/adaptive-icon.png', 1024, 1024);

  // Professional App Icons
  console.log('\nProfessional App:');
  await generateIcon(professionalIconSvg, 'professional-app/assets/icon.png', 1024, 1024);
  await generateIcon(professionalIconSvg, 'professional-app/assets/favicon.png', 48, 48);
  await generateIcon(notificationIconSvg, 'professional-app/assets/notification-icon.png', 96, 96);
  await generateIcon(adaptiveIconSvg, 'professional-app/assets/adaptive-icon.png', 1024, 1024);

  console.log('\n✅ All icons generated successfully!');
}

generateAll().catch(console.error);
