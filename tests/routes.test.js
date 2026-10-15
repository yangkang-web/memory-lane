import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveExperience,isAppPath} from '../src/routes.js';

test('school has an explicit route and the home page does not load it',()=>{
 assert.equal(resolveExperience('/').experience,'home');
 assert.equal(resolveExperience('/school').experience,'school');
 assert.equal(resolveExperience('/school','?story=1').experience,'school');
 assert.equal(resolveExperience('/schoolhouse').experience,'not-found');
});
test('shared story and character links keep parameters when redirected',()=>{
 assert.equal(resolveExperience('/','?story=1').redirect,'/school?story=1');
 assert.equal(resolveExperience('/','?student=fumiriya&view=face').redirect,'/school?student=fumiriya&view=face');
 assert.equal(resolveExperience('/school/','?story=1').redirect,'/school?story=1');
 assert.equal(resolveExperience('/','?emochi=1').experience,'emochi');
});
test('static-server fallback is restricted to app routes, not missing assets',()=>{
 for(const path of ['/','/index.html','/school','/school/'])assert.ok(isAppPath(path));
 for(const path of ['/assets/missing.wav','/school/assets/missing.vrm','/bloodbound.html','/unknown'])assert.equal(isAppPath(path),false);
});
