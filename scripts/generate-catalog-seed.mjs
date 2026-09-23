import {writeFileSync} from 'node:fs';
import {createSeed} from '../src/lib/seed.ts';
const data=createSeed();
const literal=v=>v===null?'null':typeof v==='number'||typeof v==='boolean'?String(v):"'"+String(v).replaceAll("'","''")+"'";
let sql='-- Illustrative catalog and fictional suppliers; no real orders are sent.\n-- Safe to re-run: existing IDs are not overwritten.\nbegin;\n';
for(const table of ['categories','products','suppliers','supplier_offers']){
  for(const row of data[table])sql+=`insert into public.${table} (${Object.keys(row).join(',')}) values (${Object.values(row).map(literal).join(',')}) on conflict do nothing;\n`;
}
sql+='commit;\n';writeFileSync('supabase/seed.sql',sql);console.log('Wrote supabase/seed.sql');
