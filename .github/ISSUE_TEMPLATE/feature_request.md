---
name: Feature request
about: Propose something that doesn't exist yet
title: ''
labels: enhancement
assignees: ''
---

## What you're proposing

## Why

What problem does this solve, or what does it make possible? If it's already covered by the
technical ledger (`Documentation/proposal docs/OpenDerja_TN_technical_ledger.pdf`), link the
relevant section instead of re-explaining it.

## Where this would live

- [ ] Backend
- [ ] Worker
- [ ] Scrapers
- [ ] Frontend
- [ ] Data-plane
- [ ] Database / schema
- [ ] Something else:

## Does this touch anything load-bearing?

If your proposal touches the data model, the task engine, or auth, say so explicitly — those areas
have non-obvious constraints documented in `db/DATABASE_NOTES.md` and the technical ledger, and it's
worth checking against them before writing code.

## Alternatives considered

If you thought about a different approach and rejected it, say why — saves the maintainer from
suggesting the same thing back to you.
