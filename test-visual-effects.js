#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🎬 DRONEWATCH VISUAL EFFECTS VALIDATION REPORT');
console.log('===============================================\n');

// Read the HTML file
const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Test Matrix Rain Effects
console.log('📊 MATRIX RAIN ANALYSIS:');
const matrixRainMatch = htmlContent.match(/\.matrix-rain\s*{[^}]*opacity:\s*([0-9.]+)[^}]*}/);
if (matrixRainMatch) {
  const opacity = parseFloat(matrixRainMatch[1]);
  console.log(`   ✅ Matrix Rain Opacity: ${opacity} (${(opacity * 100).toFixed(0)}%)`);
  console.log(`   📈 Enhancement Level: ${opacity >= 0.4 ? 'DRAMATIC' : 'SUBTLE'}`);
} else {
  console.log('   ❌ Matrix rain opacity not found');
}

// Test Cyber Grid Effects
console.log('\n🌐 CYBER GRID ANALYSIS:');
const cyberGridMatch = htmlContent.match(/\.cyber-grid\s*{[^}]*opacity:\s*([0-9.]+)[^}]*}/);
if (cyberGridMatch) {
  const opacity = parseFloat(cyberGridMatch[1]);
  console.log(`   ✅ Cyber Grid Opacity: ${opacity} (${(opacity * 100).toFixed(0)}%)`);
  console.log(`   📈 Enhancement Level: ${opacity >= 0.6 ? 'DRAMATIC' : 'SUBTLE'}`);
} else {
  console.log('   ❌ Cyber grid opacity not found');
}

// Test Particle System
console.log('\n✨ PARTICLE SYSTEM ANALYSIS:');
const particleCountMatch = htmlContent.match(/particleCount\s*=\s*(\d+)/);
if (particleCountMatch) {
  const count = parseInt(particleCountMatch[1]);
  console.log(`   ✅ Particle Count: ${count}`);
  console.log(`   📈 Enhancement Level: ${count >= 300 ? 'DRAMATIC' : 'SUBTLE'}`);
} else {
  console.log('   ❌ Particle count not found');
}

const particleSizeMatch = htmlContent.match(/size:\s*Math\.random\(\)\s*\*\s*(\d+)\s*\+\s*(\d+)/);
if (particleSizeMatch) {
  const multiplier = parseInt(particleSizeMatch[1]);
  const base = parseInt(particleSizeMatch[2]);
  const minSize = base;
  const maxSize = base + multiplier;
  console.log(`   ✅ Particle Size Range: ${minSize}-${maxSize}px`);
  console.log(`   📈 Enhancement Level: ${minSize >= 5 && maxSize >= 15 ? 'DRAMATIC' : 'SUBTLE'}`);
} else {
  console.log('   ❌ Particle size not found');
}

// Test Canvas Opacity
console.log('\n🎨 CANVAS OPACITY ANALYSIS:');
const canvasOpacityMatch = htmlContent.match(/particle-canvas[^>]*opacity:\s*([0-9.]+)/);
if (canvasOpacityMatch) {
  const opacity = parseFloat(canvasOpacityMatch[1]);
  console.log(`   ✅ Canvas Opacity: ${opacity} (${(opacity * 100).toFixed(0)}%)`);
  console.log(`   📈 Enhancement Level: ${opacity >= 0.6 ? 'DRAMATIC' : 'SUBTLE'}`);
} else {
  console.log('   ❌ Canvas opacity not found');
}

// Check for Enhanced Console Messages
console.log('\n📺 CONSOLE MESSAGES ANALYSIS:');
const consoleMessages = [
  '🎬 Cinematic Visual Effects Active',
  '✨ Particle System Running',
  '🌟 Holographic UI Enhanced'
];

let foundMessages = 0;
consoleMessages.forEach(msg => {
  if (htmlContent.includes(msg)) {
    console.log(`   ✅ Found: "${msg}"`);
    foundMessages++;
  } else {
    console.log(`   ❌ Missing: "${msg}"`);
  }
});

console.log(`   📊 Console Enhancement Score: ${foundMessages}/${consoleMessages.length}`);

// Overall Assessment
console.log('\n🏆 OVERALL ASSESSMENT:');
console.log('====================');

const matrixOK = htmlContent.includes('opacity: 0.4') && htmlContent.includes('matrix-rain');
const gridOK = htmlContent.includes('opacity: 0.6') && htmlContent.includes('cyber-grid');
const particleCountOK = htmlContent.includes('particleCount = 300');
const particleSizeOK = htmlContent.includes('Math.random() * 10 + 5');
const consoleOK = foundMessages >= 3;

const totalChecks = 5;
const passedChecks = [matrixOK, gridOK, particleCountOK, particleSizeOK, consoleOK].filter(Boolean).length;

console.log(`✅ Tests Passed: ${passedChecks}/${totalChecks}`);
console.log(`📊 Enhancement Score: ${Math.round((passedChecks/totalChecks) * 100)}%`);

if (passedChecks >= 4) {
  console.log('🎉 RESULT: DRAMATIC VISUAL EFFECTS CONFIRMED!');
  console.log('   The interface should now have a cyberpunk movie aesthetic');
} else if (passedChecks >= 2) {
  console.log('⚠️ RESULT: PARTIAL ENHANCEMENT DETECTED');
  console.log('   Some effects may still appear subtle');
} else {
  console.log('❌ RESULT: ENHANCEMENT NOT DETECTED');
  console.log('   Effects may still be too subtle');
}

console.log('\n🔧 RECOMMENDATIONS FOR FURTHER ENHANCEMENT:');
if (!matrixOK) console.log('   • Increase matrix rain opacity to 40%+');
if (!gridOK) console.log('   • Increase cyber grid opacity to 60%+');
if (!particleCountOK) console.log('   • Increase particle count to 300+');
if (!particleSizeOK) console.log('   • Increase particle size to 5-15px range');
if (!consoleOK) console.log('   • Add enhanced console logging messages');