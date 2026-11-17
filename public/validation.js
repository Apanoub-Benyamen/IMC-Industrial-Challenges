/* Shared client/server syntax validation. Registry authenticity is checked against uploaded documents. */
(function(root){
const digits=v=>String(v??'').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).trim();
const clean=v=>String(v??'').trim().replace(/\s+/g,' ');
const email=v=>{v=clean(v);if(v.length>254||v.includes('..'))return false;const a=v.split('@');return a.length===2&&a[0].length<=64&&/^[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~]+(?:\.[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~]+)*$/.test(a[0])&&/^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/.test(a[1]);};
const mobile=v=>{v=digits(v).replace(/[\s()\-]/g,'');if(v.startsWith('0020'))v='0'+v.slice(4);else if(v.startsWith('+20'))v='0'+v.slice(3);return /^01[0125]\d{8}$/.test(v)?v:null;};
const fullName=v=>{v=clean(v);return v.length<=120&&v.split(' ').length>=2&&v.split(' ').every(p=>/^[\p{L}\p{M}][\p{L}\p{M}.'’\-]*$/u.test(p));};
const job=v=>{v=clean(v);return v.length>=2&&v.length<=120&&/\p{L}/u.test(v)&&!/[\p{N}<>]/u.test(v);};
const commercial=(value,type='local',office='')=>{value=digits(value).replace(/\s/g,'');return type==='unified'?/^\d{15}$/.test(value)&&!/^0+$/.test(value):/^\d{1,12}$/.test(value)&&!/^0+$/.test(value)&&/\p{L}/u.test(clean(office));};
const industrial=v=>{v=digits(v);return v.length<=30&&/^\d+(?:[\s/\-]\d+)*$/.test(v)&&!/^0+$/.test(v.replace(/[\s/\-]/g,''));};
root.IMCValidation={digits,clean,email,mobile,fullName,job,commercial,industrial};
})(globalThis);
