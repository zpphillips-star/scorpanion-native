const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.connectOverCDP('http://localhost:9222'); const page=await browser.contexts()[0].newPage();
 await page.goto('https://play.google.com/console/u/0/developers/8555466934246980671/app-list', {waitUntil:'domcontentloaded'}); await page.waitForTimeout(4000);
 // list links/buttons around scorpanion
 const data=await page.evaluate(()=>Array.from(document.querySelectorAll('a,button')).map((e,i)=>({i,tag:e.tagName,text:e.innerText||e.getAttribute('aria-label')||'',href:e.href||'',aria:e.getAttribute('aria-label')||''})).filter(x=>(x.text+x.href+x.aria).toLowerCase().includes('scorpanion') || (x.text+x.aria).includes('arrow_right') || x.href.includes('app/')));
 console.log(JSON.stringify(data,null,2).slice(0,12000));
 await page.close(); await browser.close();
})().catch(e=>{console.error(e); process.exit(1)});
