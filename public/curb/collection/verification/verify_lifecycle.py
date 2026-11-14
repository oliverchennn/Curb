from pathlib import Path
import json
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent if Path(__file__).resolve().parent.name=='verification' else Path('/workspace/curb-b-recovery/public/curb/collection/verification')
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    c=b.new_context(viewport={'width':1366,'height':768},reduced_motion='reduce')
    c.add_init_script('''(()=>{
      const original=HTMLCanvasElement.prototype.getContext;
      const seen=new WeakSet();window.__collectionContexts=[];
      HTMLCanvasElement.prototype.getContext=function(kind,...args){
        const gl=original.call(this,kind,...args);
        if(kind==='webgl2'&&gl&&!seen.has(gl)){
          seen.add(gl);const resources={};
          for(const type of ['Buffer','Framebuffer','Texture','VertexArray','Renderbuffer','Program','Shader']){
            const live=new Set();resources[type]=live;
            const create=gl['create'+type].bind(gl),del=gl['delete'+type].bind(gl);
            gl['create'+type]=function(...args){const result=create(...args);if(result)live.add(result);return result};
            gl['delete'+type]=function(value){live.delete(value);return del(value)};
          }
          window.__collectionContexts.push({gl,canvas:this,resources});
        }
        return gl;
      };
    })()''')
    page=c.new_page();warnings=[];errors=[]
    page.on('console',lambda m:warnings.append(m.text) if m.type=='warning' else None)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:3001/curb/collection');page.wait_for_selector('[data-scene-canvas]');page.wait_for_timeout(250)
    cycles=[]
    for i in range(8):
        page.get_by_role('slider',name='Simulation progress').fill(str((i*3)%24))
        page.get_by_role('button',name='Static diagram',exact=True).click();page.wait_for_timeout(120)
        cycles.append(page.evaluate("window.__collectionContexts.map(c=>({connected:c.canvas.isConnected,lost:c.gl.isContextLost()}))"))
        page.get_by_role('button',name='3D scene',exact=True).click();page.wait_for_selector('[data-scene-canvas]');page.wait_for_timeout(120)
    for i in range(4):
        page.get_by_role('link',name='Try the real phone survey').click();page.wait_for_url('**/curb/upload');page.wait_for_timeout(120)
        cycles.append(page.evaluate("window.__collectionContexts.map(c=>({connected:c.canvas.isConnected,lost:c.gl.isContextLost()}))"))
        page.go_back();page.wait_for_url('**/curb/collection');page.wait_for_selector('[data-scene-canvas]');page.wait_for_timeout(120)
    page.get_by_role('button',name='Static diagram',exact=True).click();page.wait_for_timeout(120)
    records=page.evaluate("window.__collectionContexts.map(c=>({connected:c.canvas.isConnected,lost:c.gl.isContextLost(),remainingExplicit:Object.fromEntries(Object.entries(c.resources).map(([k,v])=>[k,v.size]))}))")
    result={'staticTo3DCycles':8,'navigationCycles':4,'retiredContexts':len(records),'allDisconnected':all(not r['connected'] for r in records),'allContextsLost':all(r['lost'] for r in records),'records':records,'cycles':cycles,'warnings':warnings,'errors':errors,'note':'remainingExplicit counts instrument explicit delete calls only. A lost context implicitly releases any residual GL/driver caches; these are not claimed as explicit delete calls.'}
    (OUT/'lifecycle-receipt.json').write_text(json.dumps(result,indent=2))
    assert result['allDisconnected'] and result['allContextsLost'] and not errors
    assert not any('PCFSoftShadowMap' in w for w in warnings)
    print(json.dumps(result))
    b.close()
