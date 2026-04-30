# Security

## IMPORTANT

We do not accept AI generated security reports.

## Threat Model

### Overview

czcode is an AI-powered coding assistant that runs locally on your machine. It provides an agent system with access to powerful tools including shell execution, file operations, and Lakehouse SQL execution.

### No Sandbox

czcode does **not** sandbox the agent. The permission system exists as a UX feature to help users stay aware of what actions the agent is taking — it prompts for confirmation before executing commands, writing files, or running DDL/DML SQL. However, it is not designed to provide security isolation.

If you need true isolation, run czcode inside a Docker container or VM.

### Server Mode

Server mode is opt-in only. When enabled, set `CZCODE_SERVER_PASSWORD` to require HTTP Basic Auth. Without this, the server runs unauthenticated (with a warning). It is the end user's responsibility to secure the server.

### Lakehouse Credentials

Lakehouse connection credentials (username, password) should be stored in `.env` at the repo root and never committed to git. The `.env` file is listed in `.gitignore`.

### Out of Scope

| Category | Rationale |
|---|---|
| **Server access when opted-in** | If you enable server mode, API access is expected behavior |
| **Sandbox escapes** | The permission system is not a sandbox (see above) |
| **LLM provider data handling** | Data sent to your configured LLM provider is governed by their policies |
| **Lakehouse data access** | SQL executed against your Lakehouse is governed by your Lakehouse permissions |
| **Malicious config files** | Users control their own config; modifying it is not an attack vector |

---

# Reporting Security Issues

If you have discovered a security vulnerability, please open a GitHub issue or contact the maintainers directly via the repository.
