const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash, randomUUID} = require('node:crypto');

const SHA256 = /^[a-f0-9]{64}$/;
const RECEIPT = 'receipt.json';
const ACTIVE = 'active.json';
const INVESTMENT_IMAGES=['compare','condition','exact','omit-a','omit-b','tie','brief'];
const PRESENTER_IMAGES=['original','review','crop','accepted'];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function atomicJson(directory, file, value) {
  const target = path.join(directory,file);
  const temporary = path.join(directory,'.capture-write-'+randomUUID());
  try {
    fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
    fs.renameSync(temporary,target);
  } finally {
    fs.rmSync(temporary,{force:true});
  }
}

function checkedNames(names) {
  assert.ok(names.length && new Set(names).size === names.length);
  for(const name of names) assert.match(name,/^[a-z][a-z0-9-]*$/);
}

function writeReceipt(directory, fields, names) {
  checkedNames(names);
  const images = Object.fromEntries(names.map(name=>{
    const file=name+'.png';
    return [name,{file,sha256:sha256(fs.readFileSync(path.join(directory,file)))}];
  }));
  atomicJson(directory,RECEIPT,{...fields,images});
}

function readCapture(directory, names) {
  checkedNames(names);
  const bytes=fs.readFileSync(path.join(directory,RECEIPT));
  const receipt=JSON.parse(bytes);
  assert.deepEqual(Object.keys(receipt.images).sort(),[...names].sort(),'receipt image set');
  for(const name of names) {
    const {file,sha256:expected}=receipt.images[name];
    assert.equal(file,name+'.png','image filename');
    assert.match(expected,SHA256);
    assert.equal(sha256(fs.readFileSync(path.join(directory,file))),expected,name+' image digest');
  }
  // JSON semantics, not checkout-dependent LF/CRLF bytes, identify a receipt.
  return {directory,receipt,identity:sha256(JSON.stringify(receipt))};
}

function readActive(root, names) {
  const {snapshot}=JSON.parse(fs.readFileSync(path.join(root,ACTIVE),'utf8'));
  assert.match(snapshot,SHA256,'active capture ID');
  const active=readCapture(path.join(root,'sets',snapshot),names);
  assert.equal(active.identity,snapshot,'active capture receipt digest');
  return active;
}

function activateCapture(source, root, names, check=()=>{}) {
  const candidate=readCapture(source,names);
  check(candidate.receipt);
  const sets=path.resolve(root,'sets');
  fs.mkdirSync(sets,{recursive:true});
  const staged=fs.mkdtempSync(path.join(sets,'.staging-'));
  const permanent=path.join(sets,candidate.identity);
  const files=[...names.map(name=>name+'.png'),RECEIPT];
  try {
    for(const file of files) fs.copyFileSync(path.join(source,file),path.join(staged,file));
    const copied=readCapture(staged,names);
    assert.equal(copied.identity,candidate.identity,'capture receipt changed during staging');
    if(!fs.existsSync(permanent)) fs.renameSync(staged,permanent);
    assert.equal(readCapture(permanent,names).identity,candidate.identity,'stored capture receipt digest');
    // Readers keep using the previous immutable set until this single rename.
    atomicJson(root,ACTIVE,{snapshot:candidate.identity});
    return readActive(root,names);
  } finally {
    if(fs.existsSync(staged)) {
      for(const file of files) fs.rmSync(path.join(staged,file),{force:true});
      fs.rmdirSync(staged);
    }
  }
}

module.exports={sha256,writeReceipt,readCapture,readActive,activateCapture,INVESTMENT_IMAGES,PRESENTER_IMAGES};
