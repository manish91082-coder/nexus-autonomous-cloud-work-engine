# CSV to Action — Community Adoption Plan (Private Draft)

**Status:** Private planning only; no public outreach or publication performed.

## Objective
Earn real, relevant users for a free privacy-first CSV utility before activating GitHub Sponsors. The target is organic adoption and evidence of recurring utility, not vanity stars.

## 1. Release readiness before discovery
- Obtain owner approval for a standalone public repository and explicit MIT license scope.
- Finish independent runtime browser network capture; current CI only statically checks that the page has no remote network APIs or external script/link URLs.
- Add SECURITY.md, CONTRIBUTING.md, Code of Conduct, issue templates and supported-browser matrix.
- Publish tagged release with checksum, sample CSV, English/Hindi guides and reproducible test command.
- Add a short screen recording/GIF showing local import, issue review and safe CSV export. Do not use real customer data.
- Enable GitHub's free public-repository security features where available: secret scanning, push protection, Dependabot and code scanning as applicable.

## 2. Discovery channels (manual, compliant, low-cost)
1. **GitHub search and topics:** choose accurate topics such as csv, csv-validator, privacy, offline-first, data-quality, browser-tool. Write a precise README description and usage examples. No keyword stuffing.
2. **GitHub Release:** publish a tagged version with changelog, package checksum and known limitations.
3. **Show HN:** only after the tool is genuinely ready for anyone to try without sign-up. Official guidelines require something people can use, not a landing page; the creator should be personally present to answer questions. HN says not to automate submissions or use generated text for the post. The owner must write the final post in their own words and respond personally.
4. **Reddit:** only in communities where the current rules allow relevant project feedback. Reddit prohibits repeated/mass promotional posts, unsolicited messages and promotional bots; community moderators decide their own rules. Do not mass-post or automate engagement.
5. **Technical documentation:** publish useful examples (e.g. malformed CSV, formula-injection safe export, local-only data handling) as standalone docs that help users even if they never download the tool. Avoid repetitive SEO pages.
6. **Direct user feedback:** only opt-in testers from relevant communities; no scraping, cold DMs or contact harvesting.

## 3. What to measure
Use the first 30 days after owner-approved release as an experiment. Record:
- Unique repository visitors and clones (GitHub traffic window limitations apply).
- Release asset downloads and unique download events where available.
- Stars/forks only as secondary indicators.
- Number of independent users who complete a real task and report the result.
- Reproducible bug reports, feature requests and browser compatibility failures.
- Repeat usage or repeat visits, where users voluntarily report them.
- Whether users identify the privacy/offline property as a meaningful reason to use it.

## 4. Predeclared gates (internal experiment thresholds, not industry benchmarks)
- **Technical go:** exact release commit passes CI; independent runtime network capture finds no unexpected outbound requests; no critical data-loss/XSS/formula-injection issue.
- **Early adoption signal:** at least 20 independent downloads or 10 independent users complete a real task within 30 days. These are pilot thresholds, not proof of product-market fit.
- **Problem-solution signal:** at least 5 independent users describe a recurring workflow problem that the tool solves and at least 3 return or reuse it.
- **Sponsor activation:** only after the project has a credible public release, recurring usage/maintenance and a community willing to support it. Do not activate based only on stars or compliments.
- **Stop/reposition:** if no relevant usage after the first compliant discovery cycle, do not spam more channels; reassess audience and problem.

## 5. Low-maintenance support model
- Keep the product free and open source.
- Accept bug reports through GitHub Issues; no promised SLA.
- Publish monthly changelog only when meaningful changes occur.
- GitHub Sponsors tiers, if approved later, should offer public recognition, early release access and roadmap polls only. No custom support or manual service obligations.

## 6. Compliance and trust
- No automated Reddit posting, mass messaging, fake stars, vote requests or review manipulation.
- No HN launch until the tool is ready to use; no generated post text and no vote solicitation.
- Never include real customer, candidate, invoice or financial data in screenshots, examples or test artifacts.
- Make all limitations and privacy claims precise; distinguish static source checks from a runtime security audit.

## Sources
- GitHub repository best practices: https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories
- Hacker News Show HN guidelines: https://news.ycombinator.com/showhn.html
- Hacker News general guidelines: https://news.ycombinator.com/newsguidelines.html
- Reddit spam guidance: https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam
- Reddit community spam guidance: https://support.reddithelp.com/hc/en-us/articles/28012014962580-How-do-I-keep-spam-out-of-my-community

**Current status:** Plan prepared only. No release, posting, outreach, sponsor profile or account changes have occurred.
