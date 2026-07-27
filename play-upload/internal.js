const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.connectOverCDP('http://localhost:9222'); const page=await browser.contexts()[0].newPage();
 const url='https://play.google.com/console/u/0/developers/8555466934246980671/app/4976396952645148434/tracks/internal-testing';
 await page.goto(url, {waitUntil:'domcontentloaded', timeout:60000}); await page.waitForTimeout(8000);
 console.log('url', page.url()); console.log('title', await page.title());
 const text=await page.evaluate(()=>document.body.innerText); console.log(text.slice(0,15000));
 const controls=await page.evaluate(()=>Array.from(document.querySelectorAll('a,button,input,textarea,[role=button]')).map((e,i)=>({i,tag:e.tagName,role:e.getAttribute('role')||'',type:e.getAttribute('type')||'',text:(e.innerText||e.value||'').trim(),aria:e.getAttribute('aria-label')||'',href:e.href||'',disabled:e.disabled||e.getAttribute('aria-disabled')||''})).filter(x=>(x.text+x.aria+x.href+x.type).toLowerCase().match(/release|edit|create|upload|roll|save|file|review|publish|testing|new/)));
 console.log('CONTROLS', JSON.stringify(controls,null,2).slice(0,20000));
 await page.screenshot({path:'C:/Users/zaphilli/scorpanion-native/play-upload/internal-testing.png', fullPage:false}).catch(()=>{});
 await page.close(); await browser.close();
})().catch(e=>{console.error(e); process.exit(1)});
