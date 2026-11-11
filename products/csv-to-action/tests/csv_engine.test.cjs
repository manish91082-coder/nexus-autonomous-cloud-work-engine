"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const E=require("../csv_engine.js");
test("parses quoted commas, escaped quotes and embedded newlines",()=>{const p=E.parseCSV('job_id,customer\n1,"A, Inc."\n2,"Line 1\nLine ""2"""');assert.equal(p.rows[0].customer,"A, Inc.");assert.equal(p.rows[1].customer,'Line 1\nLine "2"')});
test("rejects unterminated quotes",()=>assert.throws(()=>E.parseCSV('id,name\n1,"bad'),/quoted field/));
test("rejects duplicate headers",()=>assert.throws(()=>E.parseCSV('id,ID\n1,2'),/Duplicate column/));
test("maps alternate header names",()=>{const m=E.mapColumns(["ID","Client","Status","Amount","Paid"]);assert.equal(m.job_id,"ID");assert.equal(m.customer,"Client");assert.equal(m.invoice_amount,"Amount")});
test("detects overdue balances and invalid dates",()=>{const p=E.parseCSV('job_id,customer,job_status,invoice_amount,received_amount,invoice_due_date,next_follow_up,currency,owner\n1,Demo,active,100,25,2020-01-01,not-a-date,INR,A');const a=E.analyze(p,"2026-11-12");assert.equal(a.results[0].balance,75);assert.ok(a.results[0].actions.includes("Overdue entered balance"));assert.ok(a.results[0].issues.includes("Invalid follow-up date (use YYYY-MM-DD)") )});
test("flags duplicate IDs and overpayment",()=>{const p=E.parseCSV('job_id,customer,job_status,invoice_amount,received_amount\n1,A,active,10,0\n1,B,active,10,12');const a=E.analyze(p,"2026-11-12");assert.ok(a.results[1].issues.includes("Duplicate job ID"));assert.ok(a.results[1].issues.includes("Received amount exceeds invoice"))});
test("CSV export quotes commas and line breaks",()=>{const s=E.toCSV(["a","b"],[{a:"x",b:"line1\nline2"}]);assert.match(s,/"line1\nline2"/)});

test("neutralizes spreadsheet formula injection on export",()=>{
  const s=E.toCSV(["name","note"],[{name:"=1+1",note:" @SUM(A1:A2)"}]);
  assert.ok(s.includes("'=1+1"));
  assert.ok(s.includes("\"' @SUM(A1:A2)\""));
});
