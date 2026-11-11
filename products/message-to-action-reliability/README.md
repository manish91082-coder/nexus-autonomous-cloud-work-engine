# Message-to-Action Reliability Demo

Offline-first demonstration of a deterministic inbound-message processing pipeline. Uses only Python standard library and synthetic sample data.

## Run
```bash
python products/message-to-action-reliability/engine.py --input products/message-to-action-reliability/samples/events.json --out /tmp/message-demo
python -m unittest discover -s products/message-to-action-reliability/tests -v
```

## Demonstrated controls
- Stable event fingerprinting and duplicate suppression
- Rule-based triage into billing/complaint, urgent support, sales lead, and general
- Priority tagging and structured approval queue
- Simulated transient failure, retry, and error log
- CSV outputs and Markdown run report

## Safety
This is a prototype, not a production connector. It does not connect to Gmail, WhatsApp, a CRM, or external APIs. It never sends replies or modifies external systems. All actions remain pending human approval. It uses synthetic sample data only. No credentials, paid APIs, or third-party packages are required.

## Limitations
Classification is deterministic keyword logic, not an LLM. Production deployment requires client-owned credentials, consent, privacy/security review, provider policy checks, monitoring and explicit workflow authorization.
