# PLANNING.md — iNMerg AI Agent

Scope: **GitHub Issue → PR merged → reward**, dengan AI Agent sebagai solver.

---

## Status saat ini

| Komponen | Status | Catatan |
|---|---|---|
| Smart contract (IssuesClaimWithAVS) | ✅ Done | Deploy di Mantle Sepolia |
| Frontend (Next.js) | ✅ Done | Issues, detail, create bounty, profile, faucet |
| `agent/src/lib/nvidia.ts` | ✅ Done | NVIDIA NIM client |
| `agent/src/lib/github.ts` | ✅ Done | Fork, branch, commit, PR via GitHub API |
| `agent/src/lib/contract.ts` | ✅ Done | Baca bounty & submit claim on-chain |
| `agent/src/worker/solver.ts` | ✅ Done | Kirim issue ke NVIDIA, dapat solusi kode |
| `agent/src/worker/index.ts` | ✅ Done | Loop: poll → solve → PR → claim |
| `agent/src/orchestrator/index.ts` | ✅ Done | Buat bounty dari GitHub issue + AI enrichment |
| `web-main/api/agent/analyze` | ✅ Done | API route NVIDIA NIM untuk analisis issue |
| `SolveWithAISection` (UI) | ✅ Done | Tombol analyze + tampilkan action plan |

---

## Yang masih perlu dikerjakan

### P0 — Harus ada sebelum test end-to-end

- [ ] **Setup `.env` agent** — isi `NVIDIA_API_KEY`, `GITHUB_TOKEN`, `WORKER_PRIVATE_KEY`
- [ ] **Setup `.env.local` frontend** — isi `NVIDIA_API_KEY` untuk API route
- [ ] **Test worker agent live** — jalankan `pnpm worker` dan pastikan bisa poll + solve + PR
- [ ] **GitHub bot account** — buat akun GitHub khusus agent (bukan akun personal)

### P1 — Penting untuk UX yang baik

- [ ] **Agent status indicator di UI** — tanda di halaman issue kalau agent sedang mengerjakan
- [ ] **Notifikasi PR created** — tampilkan link PR yang dibuat agent di halaman issue
- [ ] **Error handling worker** — retry jika fork/commit/PR gagal (sekarang langsung skip)
- [ ] **Prevent double-attempt** — persistent state (sekarang hanya in-memory, reset kalau agent restart)

### P2 — Polish

- [ ] **Agent activity log** — halaman `/agent` yang menampilkan riwayat apa yang sudah dikerjakan
- [ ] **Badge "AI Solved"** di IssueCard kalau PR-nya dibuat oleh agent
- [ ] **Wallet agent auto-fund check** — warning kalau saldo mUSD/MNT agent hampir habis
- [ ] **Rate limiting** di API route `/api/agent/analyze`

---

## Cara test end-to-end

```
1. Buat bounty di /create-bounty (atau via orchestrator CLI)
2. Jalankan worker agent: cd agent && pnpm worker
3. Agent poll setiap 30s → detect bounty baru
4. Agent kirim issue ke NVIDIA → dapat solusi
5. Agent fork repo → commit → buka PR
6. PR di-review & di-merge oleh repo owner
7. AVS validasi via zkTLS → reward otomatis ke wallet agent
```

---

## Perintah penting

```sh
# Jalankan worker agent
cd agent && pnpm worker

# Buat bounty via CLI
cd agent && pnpm orchestrator https://github.com/owner/repo 42 10

# Jalankan frontend
cd web-main && pnpm dev:local
```
