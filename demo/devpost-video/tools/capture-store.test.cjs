const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const test=require('node:test');
const {writeReceipt,readActive,activateCapture}=require('./capture-store.cjs');

test('a partial or mixed capture cannot replace a complete active snapshot',t=>{
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'curb-video-capture-'));
  t.after(()=>{
    assert.equal(path.dirname(temporary),path.resolve(os.tmpdir()));
    assert.match(path.basename(temporary),/^curb-video-capture-/);
    fs.rmSync(temporary,{recursive:true,force:true});
  });
  const source=path.join(temporary,'source');
  const root=path.join(temporary,'kit');
  const names=['opening','result'];
  fs.mkdirSync(source);
  function record(revision) {
    for(const name of names) fs.writeFileSync(path.join(source,name+'.png'),revision+' '+name);
    writeReceipt(source,{revision},names);
  }
  record('first');
  const first=activateCapture(source,root,names);
  const receiptPath=path.join(first.directory,'receipt.json');
  const realReceipt=fs.readFileSync(receiptPath,'utf8');
  fs.writeFileSync(receiptPath,realReceipt.replace(/\n/g,'\r\n'));
  assert.equal(readActive(root,names).identity,first.identity);
  const pointer=fs.readFileSync(path.join(root,'active.json'));
  record('second');
  fs.writeFileSync(path.join(source,'result.png'),'first result');
  assert.throws(()=>activateCapture(source,root,names),/result image digest/);
  assert.deepEqual(fs.readFileSync(path.join(root,'active.json')),pointer);
  assert.equal(readActive(root,names).receipt.revision,'first');
  fs.unlinkSync(path.join(source,'result.png'));
  assert.throws(()=>activateCapture(source,root,names),{code:'ENOENT'});
  assert.equal(readActive(root,names).identity,first.identity);
  record('second');
  const second=activateCapture(source,root,names);
  assert.notEqual(second.identity,first.identity);
  assert.equal(readActive(root,names).receipt.revision,'second');
  assert.equal(fs.readFileSync(path.join(first.directory,'result.png'),'utf8'),'first result');
});
