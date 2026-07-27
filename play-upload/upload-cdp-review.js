const { chromium } = require('playwright');
const AAB = 'C:\\Users\\zaphilli\\scorpanion-native\\android\\app\\build\\outputs\\bundle\\release\\app-release.aab';
const NOTES = '<en-US>\nBug fixes: WNBA team sheet z-index fix (now correctly renders above game detail sheet), LPGA logo now shown on upcoming golf cards, PGA tee times displayed on homepage upcoming section.\n</en-US>';
(async()=>{
 const browser=await chromium.connectOverCDP('http://localhost:9222', {timeout:120000}); const context=browser.contexts()[0]; const page=await context.newPage(); page.setDefaultTimeout(60000);
 await page.goto('https://play.google.com/console/u/0/developers/8555466934246980671/app/4976396952645148434/tracks/4701059926239320999/releases/5/prepare',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForTimeout(7000);
 console.log('url', page.url());
 let text=await page.evaluate(()=>document.body.innerText);
 if(!text.includes('4 (1.0.3)')){
   const cdp=await context.newCDPSession(page);
   const doc=await cdp.send('DOM.getDocument', {depth:-1, pierce:true});
   const q=await cdp.send('DOM.querySelector', {nodeId: doc.root.nodeId, selector:'input[type="file"]'});
   console.log('file input node', q.nodeId);
   if(!q.nodeId) throw new Error('No file input found');
   await cdp.send('DOM.setFileInputFiles', {nodeId:q.nodeId, files:[AAB]});
   console.log('CDP setFileInputFiles sent');
   const start=Date.now(); let last='';
   for(let i=0;i<120;i++){
     await page.waitForTimeout(5000);
     text=await page.evaluate(()=>document.body.innerText).catch(()=> '');
     const lines=text.split('\n').filter(l=>/upload|processing|1\.0\.3|version|error|failed|App bundle|4 \(/i.test(l)).slice(0,40).join(' | ');
     if(lines!==last){ console.log('status', Math.round((Date.now()-start)/1000)+'s', lines); last=lines; }
     if(text.includes('4 (1.0.3)') || /1\.0\.3/.test(text)) break;
     if(/Upload failed|failed to upload|already been used|Error/i.test(text)) {
       // don't immediately break; record more if upload failed
       if(i>3) break;
     }
   }
 }
 await page.waitForTimeout(3000);
 text=await page.evaluate(()=>document.body.innerText);
 console.log('post upload has', {v103:text.includes('1.0.3'), vc4:text.includes('4 (1.0.3)'), textLen:text.length});
 console.log(text.split('\n').filter(l=>/App bundle|4 \(|1\.0\.3|Version|Target SDK|Release name|Release notes|error|failed|uploaded|bundle/i.test(l)).join('\n'));
 await page.locator('input[aria-label="Release name"]').first().fill('1.0.3');
 await page.locator('textarea[aria-label="Release notes"]').first().fill(NOTES);
 await page.waitForTimeout(2000);
 const save=page.getByText('Save as draft', {exact:true});
 if(await save.count()){
   const dis=await save.evaluate(b=>b.disabled || b.getAttribute('aria-disabled')).catch(()=>true);
   console.log('save disabled?', dis);
   if(!dis){ await save.click(); console.log('clicked save'); await page.waitForTimeout(10000); }
 }
 const next=page.getByText('Next', {exact:true});
 const nextDis=await next.evaluate(b=>b.disabled || b.getAttribute('aria-disabled')).catch(()=>null);
 console.log('next disabled?', nextDis);
 await next.click();
 await page.waitForTimeout(10000);
 console.log('review url', page.url()); console.log('review title', await page.title());
 text=await page.evaluate(()=>document.body.innerText);
 console.log('REVIEW_TEXT\n'+text.slice(0,18000));
 const controls=await page.evaluate(()=>Array.from(document.querySelectorAll('button,a,[role=button]')).map((e,i)=>({i,tag:e.tagName,text:(e.innerText||'').trim(),aria:e.getAttribute('aria-label')||'',href:e.href||'',disabled:e.disabled||e.getAttribute('aria-disabled')||''})).filter(x=>(x.text+x.aria).match(/Roll|publish|Save|Start|Send|Submit|Confirm|Next|Back|Discard|review|release|countries/i)) );
 console.log('REVIEW_CONTROLS '+JSON.stringify(controls,null,2));
 await page.screenshot({path:'C:/Users/zaphilli/scorpanion-native/play-upload/review-page.png', fullPage:true}).catch(()=>{});
 await page.close(); await browser.close();
})().catch(e=>{console.error('SCRIPT_ERROR', e); process.exit(1)});
