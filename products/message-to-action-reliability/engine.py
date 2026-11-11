#!/usr/bin/env python3
"""Deterministic, offline message-to-action demo. Uses sample JSON only."""
import argparse, csv, hashlib, json
from pathlib import Path

def fingerprint(event):
    raw=json.dumps(event,sort_keys=True,separators=(",",":"),ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def classify(text):
    s=(text or "").lower()
    if any(x in s for x in ("refund","payment failed","charged twice","complaint")): return "billing_or_complaint"
    if any(x in s for x in ("urgent","today","deadline","asap","not working","broken")): return "urgent_support"
    if any(x in s for x in ("quote","pricing","price","demo","interested")): return "sales_lead"
    return "general"

def process_events(events, fail_once_ids=None):
    fail_once_ids=set(fail_once_ids or [])
    seen=set(); rows=[]; errors=[]
    for event in events:
        event_id=str(event.get("event_id","")).strip()
        if not event_id: errors.append({"event_id":"","error":"missing_event_id"}); continue
        key=fingerprint(event)
        if key in seen:
            rows.append({"event_id":event_id,"status":"duplicate_skipped","category":"","priority":"","approval_required":"", "summary":""})
            continue
        seen.add(key)
        attempts=0
        while True:
            attempts+=1
            try:
                if event_id in fail_once_ids and attempts==1: raise RuntimeError("simulated_transient_failure")
                text=str(event.get("text",""))
                category=classify(text)
                priority="high" if category in {"billing_or_complaint","urgent_support"} else "normal"
                summary=" ".join(text.split())[:240]
                rows.append({"event_id":event_id,"status":"awaiting_human_approval","category":category,"priority":priority,"approval_required":"yes","summary":summary,"attempts":attempts,"source":event.get("source","sample")})
                break
            except Exception as exc:
                errors.append({"event_id":event_id,"attempt":attempts,"error":str(exc)})
                if attempts>=2:
                    rows.append({"event_id":event_id,"status":"failed_needs_review","category":"","priority":"", "approval_required":"yes","summary":""})
                    break
    return rows,errors

def write_outputs(rows,errors,outdir):
    out=Path(outdir); out.mkdir(parents=True,exist_ok=True)
    fields=["event_id","status","category","priority","approval_required","summary","attempts","source"]
    with (out/"approval_queue.csv").open("w",newline="",encoding="utf-8") as f:
        w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); w.writerows(rows)
    with (out/"error_log.csv").open("w",newline="",encoding="utf-8") as f:
        w=csv.DictWriter(f,fieldnames=["event_id","attempt","error"]); w.writeheader(); w.writerows(errors)
    report=["# Message-to-Action Reliability Report","",f"- Events processed: {len(rows)}",f"- Approval queue: {sum(r['status']=='awaiting_human_approval' for r in rows)}",f"- Duplicates skipped: {sum(r['status']=='duplicate_skipped' for r in rows)}",f"- Failed for review: {sum(r['status']=='failed_needs_review' for r in rows)}",f"- Retry/error records: {len(errors)}","","## Safety boundary","- No message is sent, no CRM is modified, and no external action is taken.","- Every generated action remains in a human approval queue.","- Sample data only; no credentials or customer data."]
    (out/"report.md").write_text("\n".join(report)+"\n",encoding="utf-8")

def main():
    p=argparse.ArgumentParser(); p.add_argument("--input",default="samples/events.json"); p.add_argument("--out",default="dist")
    a=p.parse_args(); events=json.loads(Path(a.input).read_text(encoding="utf-8"))
    rows,errors=process_events(events,fail_once_ids={"evt-003"}); write_outputs(rows,errors,a.out)
    print(f"processed={len(rows)} errors={len(errors)} out={a.out}")
if __name__=="__main__": main()
