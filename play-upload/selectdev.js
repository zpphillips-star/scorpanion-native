const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.connectOverCDP('http://localhost:9222'); const context=browser.contexts()[0]; const page=await context.newPage();
 await page.goto('https://play.google.com/console/developers', {waitUntil:'domcontentloaded', timeout:60000}); await page.waitForTimeout(3000);
 console.log('start', page.url(), await page.title());
 await page.getByText('Z-Plot Industries').click({timeout:10000});
 await page.waitForTimeout(6000);
 console.log('after', page.url(), await page.title());
 const text=await page.evaluate(()=>document.body.innerText);
 console.log(text.slice(0,8000));
 await page.screenshot({path:'C:/Users/zaphilli/scorpanion-native/play-upload/dev-account.png', fullPage:false}).catch(()=>{});
 await page.close(); await browser.close();
})().catch(e=>{console.error(e); process.exit(1)});
