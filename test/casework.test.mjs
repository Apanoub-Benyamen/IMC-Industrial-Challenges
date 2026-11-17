import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../public/casework.js',import.meta.url),'utf8');
function fixture(role){const context={session:role?{user:{role}}:{},esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),portalIcon:()=>'<svg></svg>',heading:t=>'<h1>'+t+'</h1>',shell(html){context.html=html},publicPage(html){context.html=html}};vm.createContext(context);vm.runInContext(code,context);return context}
test('Account guides show only the current role and the public guide supports visitors',()=>{const admin=fixture('admin');admin.guidePage();assert.match(admin.html,/دليل عمل ادارة المركز/);assert.ok(!admin.html.includes('دليل استخدام حساب المنشأة'));assert.ok(!admin.html.includes('احذف الطلب الخطأ واستعده'));const factory=fixture('factory');factory.guidePage();assert.match(factory.html,/دليل استخدام حساب المنشأة/);assert.ok(!factory.html.includes('اعتمد ملف المنشأة'));const visitor=fixture();visitor.guidePage();assert.match(visitor.html,/تواصل بدون حساب/);assert.ok(!visitor.html.includes('اعتمد ملف المنشأة'))});
test('Original factory answers are escaped and read-only in the review summary',()=>{const ctx=fixture('admin'),html=ctx.overviewPanel({company_name:'A',factories:[{id:1,name:'Plant'}]},{factory:'1',kind:'challenge',note:'<script>bad()</script>'});assert.ok(html.includes('&lt;script&gt;'));assert.ok(!/<input|<textarea|<select/.test(html));assert.ok(!html.includes('<script>'))});
test('File names and document labels cannot inject markup into the case workspace',()=>{const ctx=fixture('factory');const html=ctx.fileCards([{id:1,name:'<img src=x onerror=alert(1)>.pdf',size:1024}]);assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));assert.ok(html.includes('/api/files/1'))});
test('Factory lifecycle controls expose deletion only for drafts and preserve finished history',()=>{
 const c=fixture('factory');c.btn=(text,route)=>'<a href="#'+route+'">'+text+'</a>';
 assert.match(c.caseLifecycleControls({status:'draft',id:5}),/data-delete-case/);
 for(const status of ['submitted','needs_info','assigned','in_progress']){const html=c.caseLifecycleControls({status,id:5});assert.match(html,/data-request-closure/);assert.ok(!html.includes('data-delete-case'))}
 for(const status of ['closed','solved']){const html=c.caseLifecycleControls({status,id:5});assert.match(html,/#history/);assert.ok(!html.includes('data-delete-case'));assert.ok(!html.includes('data-request-closure'))}
 assert.equal(c.caseLifecycleControls({status:'submitted',closureRequests:[{status:'pending'}]}),'');
});
