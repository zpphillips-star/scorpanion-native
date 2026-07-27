const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.connectOverCDP('http://localhost:9222', {timeout:120000}); const context=browser.contexts()[0];
 let page=context.pages().find(p=>p.url().includes('/releases/5/review')) || await context.newPage();
 page.setDefaultTimeout(30000);
 if(!page.url().includes('/releases/5/review')) { await page.goto('https://play.google.com/console/u/0/developers/8555466934246980671/app/4976396952645148434/tracks/4701059926239320999/releases/5/review',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(5000); }
 let text=await page.evaluate(()=>document.body.innerText);
 console.log('url', page.url()); console.log('has modal', text.includes('Publish change on Google Play?'));
 if(!text.includes('Publish change on Google Play?')) { await page.getByText('Save and publish', {exact:true}).last().click({force:true}); await page.waitForTimeout(3000); }
 const buttons=await page.locator('button:has-text("Save and publish")').count(); console.log('button count', buttons);
 await page.locator('button:has-text("Save and publish")').last().click({force:true});
 console.log('forced modal save');
 await page.waitForTimeout(15000);
 text=await page.evaluate(()=>document.body.innerText);
 console.log('after url', page.url());
 console.log('after text\n'+text.slice(0,15000));
 await page.screenshot({path:'C:/Users/zaphilli/scorpanion-native/play-upload/published-status.png', fullPage:true}).catch(()=>{});
 await page.close(); await browser.close();
})().catch(e=>{console.error('SCRIPT_ERROR', e); process.exit(1)});
