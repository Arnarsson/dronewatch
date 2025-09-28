import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function captureVisualEffects() {
  console.log('🎬 Starting Visual Effects Screenshot Test...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('🎬') || msg.text().includes('✨') || msg.text().includes('🌟')) {
        console.log(`📺 Console: ${msg.text()}`);
      }
    });

    console.log('🌐 Navigating to DroneWatch...');
    await page.goto(`http://localhost:8081/index.html`);

    // Wait for page to load and effects to initialize
    console.log('⏳ Waiting for visual effects to initialize...');
    await page.waitForTimeout(5000);

    // Check if effects are loaded
    const matrixRain = await page.locator('.matrix-rain').count();
    const cyberGrid = await page.locator('.cyber-grid').count();
    const particleCanvas = await page.locator('#particle-canvas').count();

    console.log(`✅ Matrix Rain Elements: ${matrixRain}`);
    console.log(`✅ Cyber Grid Elements: ${cyberGrid}`);
    console.log(`✅ Particle Canvas Elements: ${particleCanvas}`);

    // Get computed styles
    const matrixOpacity = await page.locator('.matrix-rain').evaluate(el =>
      window.getComputedStyle(el).opacity
    );
    const gridOpacity = await page.locator('.cyber-grid').evaluate(el =>
      window.getComputedStyle(el).opacity
    );
    const canvasOpacity = await page.locator('#particle-canvas').evaluate(el =>
      window.getComputedStyle(el).opacity
    );

    console.log(`🎨 Matrix Rain Opacity: ${matrixOpacity}`);
    console.log(`🎨 Cyber Grid Opacity: ${gridOpacity}`);
    console.log(`🎨 Canvas Opacity: ${canvasOpacity}`);

    // Take screenshots
    console.log('📸 Capturing full-page screenshot...');
    await page.screenshot({
      path: path.join(__dirname, 'visual-effects-test.png'),
      fullPage: true
    });

    // Take viewport screenshot
    console.log('📸 Capturing viewport screenshot...');
    await page.screenshot({
      path: path.join(__dirname, 'visual-effects-viewport.png')
    });

    // Test performance
    console.log('⚡ Testing performance...');
    const metrics = await page.evaluate(() => {
      return new Promise(resolve => {
        let frames = 0;
        let startTime = performance.now();

        function countFrame() {
          frames++;
          if (frames < 60) {
            requestAnimationFrame(countFrame);
          } else {
            const endTime = performance.now();
            const fps = Math.round(1000 * frames / (endTime - startTime));
            resolve({ fps, frames, duration: endTime - startTime });
          }
        }

        requestAnimationFrame(countFrame);
      });
    });

    console.log(`📊 Performance: ${metrics.fps} FPS over ${metrics.frames} frames`);
    console.log(`⏱️ Test Duration: ${Math.round(metrics.duration)}ms`);

    // Check particle count
    const particleCount = await page.evaluate(() => {
      const canvas = document.getElementById('particle-canvas');
      if (canvas && window.particleSystem) {
        return window.particleSystem.particles ? window.particleSystem.particles.length : 'Not found';
      }
      return 'System not initialized';
    });

    console.log(`✨ Active Particles: ${particleCount}`);

    console.log('\n🎉 Visual Effects Test Complete!');
    console.log(`📁 Screenshots saved:`);
    console.log(`   • visual-effects-test.png (full page)`);
    console.log(`   • visual-effects-viewport.png (viewport)`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

captureVisualEffects();