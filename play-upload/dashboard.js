const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.connectOverCDP('http://localhost:9222'); const page=await browser.contexts()[0].newPage();
 await page.goto('https://play.google.com/console/u/0/developers/8555466934246980671/app/4976396952645148434/app-dashboard', {waitUntil:'domcontentloaded', timeout:60000}); await page.waitForTimeout(7000);
 console.log('url', page.url()); console.log('title', await page.title());
 const text=await page.evaluate(()=>document.body.innerText); console.log(text.slice(0,10000));
 const links=await page.evaluate(()=>Array.from(document.querySelectorAll('a,button')).map((e,i)=>({i,tag:e.tagName,text:(e.innerText||'').trim(),href:e.href||'',aria:e.getAttribute('aria-label')||'',title:e.getAttribute('title')||''})).filter(x=>(x.text+x.href+x.aria+x.title).toLowerCase().match(/internal|testing|release|track/)));
 console.log('LINKS', JSON.stringify(links,null,2).slice(0,12000));
 await page.screenshot({path:'C:/Users/zaphilli/scorpanion-native/play-upload/app-dashboard.png', fullPage:false}).catch(()=>{});
 await page.close(); await browser.close();
})().catch(e=>{console.error(e); process.exit(1)});
