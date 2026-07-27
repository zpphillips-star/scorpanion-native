const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.connectOverCDP('http://localhost:9222', {timeout:120000}); const page=await browser.contexts()[0].newPage();
 await page.goto('https://play.google.com/apps/internaltest/4701059926239320999', {waitUntil:'domcontentloaded', timeout:60000});
 await page.waitForTimeout(6000);
 console.log('url', page.url()); console.log('title', await page.title());
 const text=await page.evaluate(()=>document.body.innerText).catch(e=>e.message);
 console.log(text.slice(0,10000));
 await page.screenshot({path:'C:/Users/zaphilli/scorpanion-native/play-upload/internal-test-link.png', fullPage:true}).catch(()=>{});
 await page.close(); await browser.close();
})().catch(e=>{console.error('SCRIPT_ERROR',e); process.exit(1)});
