import { chromium } from 'playwright-core';

async function runResponsiveChecks() {
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { width: 375, height: 667, name: 'iPhone SE (375px)' },
    { width: 390, height: 844, name: 'iPhone 12/13/14 (390px)' },
    { width: 414, height: 896, name: 'iPhone XR/11 (414px)' },
    { width: 768, height: 1024, name: 'iPad / Tablet (768px)' },
    { width: 1280, height: 800, name: 'Desktop (1280px)' },
  ];

  console.log('--- STARTING RESPONSIVE & LAYOUT CHECKS ON http://localhost:3005 ---');

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3005/', { waitUntil: 'networkidle' });

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    const hasHeader = (await page.$('header.admin-header')) !== null;
    const hasFilterBar = (await page.$('div.admin-filter-bar')) !== null;
    const hasTable = (await page.$('div.table-card')) !== null;

    console.log(
      `Dashboard [${vp.name}]: Overflow = ${overflow ? 'FAIL' : 'PASS'}, Header = ${hasHeader ? 'OK' : 'MISSING'}, FilterBar = ${hasFilterBar ? 'OK' : 'MISSING'}, Table = ${hasTable ? 'OK' : 'MISSING'}, ConsoleErrors = ${consoleErrors.length}`
    );

    await page.close();
  }

  await browser.close();
  console.log('--- RESPONSIVE & LAYOUT CHECKS COMPLETED ---');
}

runResponsiveChecks().catch((err) => {
  console.error('Error running responsive checks:', err);
  process.exit(1);
});
