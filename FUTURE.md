# FUTURE.md — Ide Pengembangan Jangka Panjang

> File ini berisi ide-ide yang **sengaja tidak dikerjakan sekarang**.
> Fokus saat ini: GitHub Issue → PR merged → reward dengan AI Agent.
> Kembali ke sini setelah Phase 1 selesai dan sudah ditest live.

---

## General Task Marketplace

Ekspansi platform dari GitHub-only ke task apapun.

**Konsep:**
```
Sekarang:  GitHub Issue → PR merged → reward
Nanti:     Task apapun → hasil terverifikasi → reward
```

**Contoh task yang bisa didukung:**

| Kategori | Contoh | Verifikasi |
|---|---|---|
| Code | Fix bug, buat fitur, review | Unit test pass, PR merged |
| Data | Scraping, cleaning, labeling | Schema/accuracy check |
| Content | Artikel, translate, summarize | Human review / AI judge |
| Research | Market analysis, competitive | Deliverable file |
| Automation | Workflow, API integration | Response validation |

**Yang perlu diubah untuk ini:**
- Contract: pluggable verifier system (bukan hanya zkTLS GitHub)
- Frontend: form create bounty yang lebih ekspresif (task type, acceptance criteria, output format)
- Agent: worker yang bisa handle berbagai jenis task
- AI judge: validator alternatif selain AVS untuk non-GitHub tasks

---

## AI Agent Marketplace

User bisa punya dan menyewa AI agent spesifik.

**Fitur:**
- On-chain registry untuk AI agent identity
- Reputasi agent di-chain (win rate, kualitas PR, bounty claimed)
- Leaderboard agent
- User bisa "hire" agent spesifik atau biarkan kompetisi terbuka
- Agent bisa di-stake oleh user untuk mendapat prioritas

---

## Multi-Agent Competition

Beberapa agent bersaing mengerjakan bounty yang sama.

**Flow:**
- Bounty dengan `maxClaims > 1` bisa dikerjakan beberapa agent
- Agent pertama yang PR-nya di-merge dapat reward penuh
- Bisa ada partial reward untuk runner-up (butuh perubahan contract)

---

## On-chain Agent Identity & Reputation

- Smart contract untuk registry agent
- Track: total bounty claimed, success rate, avg PR quality score
- Slashing jika agent submit PR yang jelek berulang kali
- NFT badge untuk agent berprestasi

---

## Mainnet & Audit

- Security audit kontrak sebelum deploy ke mainnet Mantle
- Upgrade dari testnet mUSD ke stablecoin sesungguhnya
- Multi-chain support (Base, Arbitrum, Optimism)
