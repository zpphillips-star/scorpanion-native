const { chromium } = require('playwright');
const AAB = 'C:/Users/zaphilli/scorpanion-native/android/app/build/outputs/bundle/release/app-release.aab';
const NOTES = '<en-US>\nBug fixes: WNBA team sheet z-index fix (now correctly renders above game detail sheet), LPGA logo now shown on upcoming golf cards, PGA tee times displayed on homepage upcoming section.\n</en-US>';
(async()=>{
 const browser=await chromium.connectOverCDP('http://localhost:9222', { timeout: 120000 }); const page=await browser.contexts()[0].newPage();
 page.setDefaultTimeout(60000);
 const url='https://play.google.com/console/u/0/developers/8555466934246980671/app/4976396952645148434/tracks/4701059926239320999/releases/5/prepare';
 await page.goto(url, {waitUntil:'domcontentloaded', timeout:60000}); await page.waitForTimeout(5000);
 console.log('prepare url', page.url());
 let text=await page.evaluate(()=>document.body.innerText);
 console.log('initial has v4?', text.includes('4 (1.0.3)'), 'has Upload?', text.includes('Upload'));
 if(!text.includes('4 (1.0.3)')){
   const input=page.locator('input[type=file]').first();
   await input.setInputFiles(AAB);
   console.log('set input files; waiting for upload/process...');
   const start=Date.now();
   let last='';
   for(let i=0;i<90;i++){
     await page.waitForTimeout(5000);
     text=await page.evaluate(()=>document.body.innerText).catch(e=>'');
     const lines=text.split('\n').filter(l=>/upload|processing|1\.0\.3|version|error|failed|App bundle|4 \(/i.test(l)).slice(0,30).join(' | ');
     if(lines!==last){ console.log('status', Math.round((Date.now()-start)/1000)+'s', lines); last=lines; }
     if(text.includes('4 (1.0.3)') || /1\.0\.3/.test(text)) break;
     if(/Upload failed|failed to upload|already been used/i.test(text)) break;
   }
 }
 await page.waitForTimeout(3000);
 text=await page.evaluate(()=>document.body.innerText);
 console.log('after upload excerpt:\n', text.split('\n').filter(l=>/App bundle|4 \(|1\.0\.3|Version|Target SDK|Release name|Release notes|error|failed|uploaded/i.test(l)).join('\n'));
 // Fill release name
 const releaseInput = page.locator('input[aria-label="Release name"]').first();
 if(await releaseInput.count()) { await releaseInput.fill('1.0.3'); console.log('filled release name'); }
 // Fill release notes
 const notes = page.locator('textarea[aria-label="Release notes"]').first();
 if(await notes.count()) { await notes.fill(NOTES); console.log('filled release notes'); }
 await page.waitForTimeout(2000);
 // Click Save as draft if enabled, then Next
 const buttons = await page.evaluate(()=>Array.from(document.querySelectorAll('button')).map((b,i)=>({i,text:b.innerText,disabled:b.disabled || b.getAttribute('aria-disabled')})) );
 console.log('buttons before next', JSON.stringify(buttons.filter(b=>/Save|Next|Discard|Review|Roll|publish/i.test(b.text)), null, 2));
 const save=page.getByText('Save as draft', {exact:true});
 if(await save.count()){
   const dis=await save.evaluate(b=>b.disabled || b.getAttribute('aria-disabled')).catch(()=>true);
   if(!dis){ await save.click(); console.log('clicked save as draft'); await page.waitForTimeout(8000); }
 }
 const next=page.getByText('Next', {exact:true});
 await next.click(); console.log('clicked next');
 await page.waitForTimeout(10000);
 console.log('review url', page.url()); console.log('review title', await page.title());
 text=await page.evaluate(()=>document.body.innerText);
 console.log('REVIEW TEXT START\n'+text.slice(0,20000)+'\nREVIEW TEXT END');
 const controls=await page.evaluate(()=>Array.from(document.querySelectorAll('button,a,[role=button]')).map((e,i)=>({i,tag:e.tagName,text:(e.innerText||'').trim(),aria:e.getAttribute('aria-label')||'',href:e.href||'',disabled:e.disabled||e.getAttribute('aria-disabled')||''})).filter(x=>(x.text+x.aria).match(/Roll|publish|Save|Start|Send|Submit|Confirm|Next|Back|Discard|review|release/i)) );
 console.log('REVIEW CONTROLS '+JSON.stringify(controls,null,2));
 await page.screenshot({path:'C:/Users/zaphilli/scorpanion-native/play-upload/review-page.png', fullPage:true}).catch(()=>{});
 await page.close(); await browser.close();
})().catch(e=>{console.error('SCRIPT_ERROR',e); process.exit(1)});
