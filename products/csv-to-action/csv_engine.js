(function(root){
  "use strict";
  const REQUIRED=["job_id","customer","job_status","invoice_amount","received_amount","invoice_due_date","next_follow_up","currency","owner"];
  const ALIASES={
    job_id:["job_id","job id","id","work_id","order_id"],
    customer:["customer","client","buyer","customer_name","client_name"],
    job_status:["job_status","status","stage"],
    invoice_amount:["invoice_amount","invoice amount","invoice_total","amount","billed_amount"],
    received_amount:["received_amount","received amount","paid_amount","amount_received","collected"],
    invoice_due_date:["invoice_due_date","due_date","invoice due date","payment_due"],
    next_follow_up:["next_follow_up","follow_up","next follow up","followup_date","reminder_date"],
    currency:["currency","ccy"],
    owner:["owner","assigned_to","assignee"]
  };
  function parseCSV(input){
    const s=String(input||"").replace(/^\uFEFF/,"");
    const rows=[];let row=[],cell="",quoted=false;
    for(let i=0;i<s.length;i++){
      const c=s[i],n=s[i+1];
      if(quoted){
        if(c==='"'&&n==='"'){cell+='"';i++;}
        else if(c==='"')quoted=false;
        else cell+=c;
      }else if(c==='"'){
        if(cell.length)throw new Error("Unexpected quote inside an unquoted field.");
        quoted=true;
      }else if(c===","){row.push(cell);cell="";}
      else if(c==="\n"){row.push(cell);rows.push(row);row=[];cell="";}
      else if(c==="\r"){if(n==="\n")i++;row.push(cell);rows.push(row);row=[];cell="";}
      else cell+=c;
    }
    if(quoted)throw new Error("CSV ends inside a quoted field.");
    if(cell.length||row.length){row.push(cell);rows.push(row);}
    while(rows.length&&rows[rows.length-1].every(v=>v===""))rows.pop();
    if(!rows.length)throw new Error("The CSV file is empty.");
    const headers=rows.shift().map(h=>h.trim());
    if(headers.some(h=>!h))throw new Error("Every column needs a header.");
    if(new Set(headers.map(h=>h.toLowerCase())).size!==headers.length)throw new Error("Duplicate column headers are not allowed.");
    const data=rows.filter(r=>!(r.length===1&&r[0]==="")).map((r,i)=>{
      if(r.length>headers.length)throw new Error("Row "+(i+2)+" has more values than headers.");
      const out={};headers.forEach((h,j)=>out[h]=(r[j]??"").trim());return out;
    });
    return {headers,rows:data};
  }
  function normalizeHeader(s){return String(s||"").trim().toLowerCase().replace(/[\s-]+/g,"_");}
  function mapColumns(headers){
    const normalized=headers.map(h=>({raw:h,n:normalizeHeader(h)}));const map={};
    for(const key of REQUIRED){const aliases=ALIASES[key].map(normalizeHeader);const found=normalized.find(x=>aliases.includes(x.n));if(found)map[key]=found.raw;}
    return map;
  }
  function amount(v){
    let s=String(v??"").trim().replace(/[₹$€£\s]/g,"");
    if(!s)return 0;
    const valid=/^(?:\d+|\d{1,2}(?:,\d{2})*(?:,\d{3})?|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;
    if(!valid.test(s))return null;
    s=s.replace(/,/g,"");const n=Number(s);return Number.isFinite(n)&&n>=0?n:null;
  }
  function isoDate(v){
    const s=String(v||"").trim();if(!s)return null;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
    const d=new Date(s+"T00:00:00Z");
    return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===s?s:false;
  }
  function analyze(parsed,today){
    const map=mapColumns(parsed.headers);
    if(!map.job_id||!map.customer||!map.job_status||!map.invoice_amount||!map.received_amount)
      throw new Error("Required columns not found. Need at least job_id, customer, job_status, invoice_amount and received_amount. Found: "+Object.keys(map).join(", "));
    const seen=new Set(),results=[],now=today||new Date().toISOString().slice(0,10);
    parsed.rows.forEach((r,index)=>{
      const value=k=>map[k]?r[map[k]]:"";
      const id=value("job_id"),customer=value("customer"),status=value("job_status");
      const inv=amount(value("invoice_amount")),paid=amount(value("received_amount"));
      const due=isoDate(value("invoice_due_date")),follow=isoDate(value("next_follow_up"));
      const issues=[],actions=[];
      if(!id)issues.push("Missing job ID");else if(seen.has(id))issues.push("Duplicate job ID");else seen.add(id);
      if(!customer)issues.push("Missing customer");
      if(inv===null)issues.push("Invalid invoice amount");
      if(paid===null)issues.push("Invalid received amount");
      if(due===false)issues.push("Invalid due date (use YYYY-MM-DD)");
      if(follow===false)issues.push("Invalid follow-up date (use YYYY-MM-DD)");
      if(inv!==null&&paid!==null&&paid>inv)issues.push("Received amount exceeds invoice");
      const balance=inv!==null&&paid!==null?Math.max(0,Math.round((inv-paid)*100)/100):null;
      if(balance>0&&due&&due!==false&&due<now)actions.push("Overdue entered balance");
      if(follow&&follow!==false&&follow<=now)actions.push("Follow-up due");
      if(!follow&&status.toLowerCase()!=="closed"&&status.toLowerCase()!=="cancelled"&&status.toLowerCase()!=="paid")actions.push("No next follow-up date");
      if((status.toLowerCase()==="completed"||status.toLowerCase()==="delivered")&&inv===0)actions.push("Completed without invoice amount");
      results.push({line:index+2,id,customer,status,currency:value("currency"),invoice:inv,received:paid,balance,due:due||"",follow:follow||"",owner:value("owner"),issues,actions,raw:r});
    });
    const currencySet=new Set(results.map(r=>r.currency).filter(Boolean));
    const totals=results.reduce((a,r)=>{if(r.invoice!==null)a.invoice+=r.invoice;if(r.received!==null)a.received+=r.received;if(r.balance!==null)a.balance+=r.balance;a.issues+=r.issues.length;a.actions+=r.actions.length;return a;},{invoice:0,received:0,balance:0,issues:0,actions:0});
    totals.mixedCurrencies=currencySet.size>1;totals.currencyLabels=[...currencySet];
    return {map,results,totals,today:now};
  }
  function csvEscape(v){let s=String(v??"");if(/^[\s]*[=+@]/.test(s)||/^[\s]*-/.test(s))s="'"+s;return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
  function toCSV(headers,rows){return [headers.map(csvEscape).join(","),...rows.map(r=>headers.map(h=>csvEscape(r[h])).join(","))].join("\r\n")+"\r\n";}
  const api={REQUIRED,parseCSV,mapColumns,analyze,toCSV};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.CSVActionEngine=api;
})(typeof globalThis!=="undefined"?globalThis:this);
