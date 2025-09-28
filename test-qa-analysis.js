import puppeteer from 'puppeteer';

async function runQAAnalysis() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();

  // Listen for console logs and errors
  const consoleMessages = [];
  const errors = [];

  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text()
    });
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  try {
    console.log('📊 QA ANALYSIS STARTING');
    console.log('========================');

    // Navigate to the page
    await page.goto('http://localhost:8081/index.html', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Page loaded successfully');

    // Wait a bit for any JS to execute
    await page.waitForTimeout(3000);

    // Check if About button exists and is clickable
    const aboutButton = await page.$('.about-btn');
    console.log(aboutButton ? '✅ About button found' : '❌ About button NOT found');

    // Check if Share button exists and is clickable
    const shareButton = await page.$('.share-btn');
    console.log(shareButton ? '✅ Share button found' : '❌ Share button NOT found');

    // Check for legends section
    const legendsSection = await page.$('.public-legends');
    console.log(legendsSection ? '✅ Legends section found' : '❌ Legends section NOT found');

    // Get header structure
    const headerElements = await page.evaluate(() => {
      const header = document.querySelector('.header');
      if (!header) return null;

      const buttons = Array.from(header.querySelectorAll('button')).map(btn => ({
        class: btn.className,
        text: btn.textContent.trim(),
        visible: window.getComputedStyle(btn).display !== 'none'
      }));

      return {
        exists: true,
        buttons: buttons
      };
    });

    console.log('\n🔍 HEADER STRUCTURE ANALYSIS');
    console.log('============================');
    if (headerElements) {
      console.log('Header found with the following buttons:');
      headerElements.buttons.forEach((btn, index) => {
        console.log(`  ${index + 1}. ${btn.text} (${btn.class}) - ${btn.visible ? 'Visible' : 'Hidden'}`);
      });
    } else {
      console.log('❌ Header not found');
    }

    // Test About button functionality
    console.log('\n🧪 TESTING ABOUT BUTTON');
    console.log('========================');
    if (aboutButton) {
      try {
        await aboutButton.click();
        await page.waitForTimeout(1000);

        const aboutPanel = await page.$('.about-panel');
        if (aboutPanel) {
          console.log('✅ About panel opened successfully');

          // Close the panel
          const closeButton = await page.$('.about-panel button');
          if (closeButton) {
            await closeButton.click();
            console.log('✅ About panel closed successfully');
          }
        } else {
          console.log('❌ About panel did not open');
        }
      } catch (error) {
        console.log('❌ Error clicking About button:', error.message);
      }
    }

    // Test Share button functionality
    console.log('\n🧪 TESTING SHARE BUTTON');
    console.log('========================');
    if (shareButton) {
      try {
        await shareButton.click();
        await page.waitForTimeout(1000);
        console.log('✅ Share button clicked successfully');
      } catch (error) {
        console.log('❌ Error clicking Share button:', error.message);
      }
    }

    // Report console messages
    console.log('\n📜 CONSOLE MESSAGES');
    console.log('===================');
    const errorMessages = consoleMessages.filter(msg => msg.type === 'error');
    const warningMessages = consoleMessages.filter(msg => msg.type === 'warning');
    const infoMessages = consoleMessages.filter(msg => ['log', 'info'].includes(msg.type));

    if (errorMessages.length > 0) {
      console.log('❌ JavaScript Errors:');
      errorMessages.forEach(msg => console.log(`  - ${msg.text}`));
    } else {
      console.log('✅ No JavaScript errors found');
    }

    if (warningMessages.length > 0) {
      console.log('⚠️ Warnings:');
      warningMessages.forEach(msg => console.log(`  - ${msg.text}`));
    } else {
      console.log('✅ No warnings found');
    }

    console.log(`📊 Total console messages: ${consoleMessages.length}`);

    // Check page errors
    console.log('\n🔥 PAGE ERRORS');
    console.log('==============');
    if (errors.length > 0) {
      console.log('❌ Page Errors:');
      errors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✅ No page errors found');
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

runQAAnalysis().catch(console.error);