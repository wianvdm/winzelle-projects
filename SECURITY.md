# Security policy

## Reporting a vulnerability

Report privately. Never open a public issue, pull request, or comment describing a vulnerability.

1. Preferred: GitHub private vulnerability reporting at https://github.com/wianvdm/winzelle-projects/security/advisories/new. If that page reports the feature is unavailable, continue to step 2.
2. Contact the maintainer `@WianVDM` through a private GitHub channel.

Include: affected component (site, Worker, Sanity content path, contact form), reproduction steps, impact, and whether the vulnerability is public or exploited.

## What to expect

- Acknowledgement by the maintainer, targeting 72 hours.
- Fixes are developed on a private branch and released at the maintainer's discretion.
- Public disclosure happens only after a fix ships, coordinated with the reporter. There is no bounty program.

## Scope notes

- `main` is the only supported source version. Production hosting uses a Cloudflare Worker.
- `VITE_` prefixed variables (Sanity project coordinates, `VITE_WEB3FORMS_ACCESS_KEY`) are public build values by design, not secrets. `VITE_WEB3FORMS_ACCESS_KEY` is protected by origin restriction on the Web3Forms side and must never be stored as a GitHub secret or moved to a private variable without an issue tracking the change.
- Security work triaged by the maintainer carries `type:security` and stays free of public vulnerability details until disclosure.
