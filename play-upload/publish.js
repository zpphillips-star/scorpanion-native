const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.connectOverCDP('http://localhost:9222', {timeout:120000}); const page=await browser.contexts()[0].newPage(); page.setDefaultTimeout(60000);
 await page.goto('https://play.google.com/console/u/0/developers/8555466934246980671/app/4976396952645148434/tracks/4701059926239320999/releases/5/review',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForTimeout(6000);
 console.log('url', page.url());
 let text=await page.evaluate(()=>document.body.innerText); console.log('before publish has Save and publish', text.includes('Save and publish'));
 await page.getByText('Save and publish', {exact:true}).click();
 console.log('clicked Save and publish');
 await page.waitForTimeout(5000);
 text=await page.evaluate(()=>document.body.innerText);
 console.log('after click text start\n'+text.slice(0,8000));
 let controls=await page.evaluate(()=>Array.from(document.querySelectorAll('button,a,[role=button]')).map((e,i)=>({i,tag:e.tagName,text:(e.innerText||'').trim(),aria:e.getAttribute('aria-label')||'',disabled:e.disabled||e.getAttribute('aria-disabled')||''})).filter(x=>(x.text+x.aria).match(/publish|roll|confirm|save|submit|start|continue|ok|got it/i)) );
 console.log('controls1 '+JSON.stringify(controls,null,2));
 // click any confirmation if present
 for(const label of ['Publish','Save and publish','Roll out','Start rollout','Confirm','Submit','OK','Got it']){
   const loc=page.getByText(label, {exact:true});
   if(await loc.count()){
     const dis=await loc.first().evaluate(e=>e.disabled || e.getAttribute('aria-disabled')).catch(()=>false);
     if(!dis){ console.log('click confirm', label); await loc.first().click(); await page.waitForTimeout(8000); break; }
   }
 }
 text=await page.evaluate(()=>document.body.innerText);
 console.log('after confirm url', page.url());
 console.log('after confirm text\n'+text.slice(0,15000));
 controls=await page.evaluate(()=>Array.from(document.querySelectorAll('button,a,[role=button]')).map((e,i)=>({i,tag:e.tagName,text:(e.innerText||'').trim(),aria:e.getAttribute('aria-label')||'',href:e.href||'',disabled:e.disabled||e.getAttribute('aria-disabled')||''})).filter(x=>(x.text+x.aria+x.href).match(/publish|roll|release|internal|manage|view|testing/i)) );
 console.log('controls2 '+JSON.stringify(controls,null,2).slice(0,12000));
 await page.screenshot({path:'C:/Users/zaphilli/scorpanion-native/play-upload/after-publish.png', fullPage:true}).catch(()=>{});
 await page.close(); await browser.close();
})().catch(e=>{console.error('SCRIPT_ERROR', e); process.exit(1)});
