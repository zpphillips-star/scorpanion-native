const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.connectOverCDP('http://localhost:9222');
 const context=browser.contexts()[0];
 const page=await context.newPage();
 await page.goto('https://play.google.com/console', {waitUntil:'domcontentloaded', timeout:60000});
 await page.waitForTimeout(5000);
 console.log('URL', page.url());
 console.log('TITLE', await page.title());
 const text=await page.evaluate(()=>document.body.innerText).catch(e=>'ERR '+e.message);
 console.log(text.slice(0,5000));
 await page.screenshot({path:'C:/Users/zaphilli/scorpanion-native/play-upload/console-home.png', fullPage:false}).catch(()=>{});
 await page.close();
 await browser.close();
})().catch(e=>{console.error(e); process.exit(1)});
