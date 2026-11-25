# Which tool answers which question

| Question | Tool | Writes? |
|---|---|---|
| Which project am I on? Switch to another folder | `faf_context` (`path` to switch) | No |
| What is the .faf format? | `faf_about` | No |
| What is the score, and which slots are empty? | `faf_score` (`details: true`) | No |
| Why is this slot empty, and which tool fills it? | `faf_doctor` | No |
| Create a project.faf (name, language, stack detected) | `faf_init` | Yes |
| Fill what the repo states | `faf_auto` | Yes |
| The human slots: show, ask, write the answers | `faf_go` | Yes, with `answers` |
| Prove the score | `faf_trust` | No |
| Does the .faf change what the AI gets right? | `faf_bench` | No |
| Write CLAUDE.md from project.faf | `faf_sync` | Yes |
| Write Claude Code's MEMORY.md from project.faf | `faf_tri_sync` | Yes |
| Refresh context every session | `faf_setup` | Yes, with `confirm: true` |
| Remember something the user asked to keep | `faf_etch` | Yes |
| Read it back | `faf_recall` | No |

All fourteen are on the default tools/list. With `FAF_TOOLS=all` the server
also lists its Extended tools.
