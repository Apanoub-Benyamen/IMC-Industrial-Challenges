/* Shared filtering and draft comparison; records keep their original display text. */
(function(root){
const digits=s=>String(s??'').replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)-(c>='۰'?1776:1632)));
const normalize=s=>digits(s).normalize('NFKC').toLowerCase().replace(/[\u064b-\u065f\u0670ـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
function matches(record,query){const raw=digits(query).trim();if(!raw)return true;const ref=raw.match(/^(?:imc[\s-]*)?0*(\d+)$/i);if(ref)return Number(ref[1])===Number(record.id);const haystack=normalize([record.title,record.name,record.company_name,record.factory_names,record.id,'IMC-'+String(record.id).padStart(5,'0')].join(' '));return normalize(query).split(' ').every(word=>haystack.includes(word));}
function day(value){if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return '';return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
function validDay(value){if(!value)return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;}
function within(value,from='',to=''){const d=day(value);return !!d&&(!from||d>=from)&&(!to||d<=to);}
function draftSignature(state){const data={...state};for(const key of ['step','_display','submitted','ref'])delete data[key];return JSON.stringify(Object.fromEntries(Object.keys(data).sort().map(k=>[k,data[k]])));}
function meaningfulDraft(state){return !!state.kind||Object.entries(state).some(([k,v])=>!['factory','step','_display','submitted','ref'].includes(k)&&(Array.isArray(v)?v.length:typeof v==='string'?v.trim():v===true));}
root.IMCRecords={digits,normalize,matches,day,validDay,within,draftSignature,meaningfulDraft};
})(globalThis);
