# Backend API Gaps

This document tracks missing backend endpoints that the frontend requires.

## Missing Endpoints (add to FastAPI)

| Endpoint | Method | Purpose | Request Body | Response |
|----------|--------|---------|--------------|----------|
| `/api/v1/incidentes/mis-asignaciones/` | GET | List incidents assigned to current user | - | `{ results: Incidente[], total: number }` |
| `/api/v1/preguntas-auditoria/` | GET | List audit questions with ?seccion=&activo= | - | `{ results: PreguntaAuditoria[] }` |
| `/api/v1/auditoria-respuestas/batch` | POST | Batch create audit responses | `{ auditoria_id, respuestas: [...] }` | created records |
| `/api/v1/verificaciones-reincidencia/` | GET/POST | CRUD for recurrence verifications | varies | `{ results: [...] }` or created record |

## Backend Integrations Required

### Zigo API Integration
The `POST /api/v1/guias/` endpoint must:
1. Generate the `numero_guia` (format: `HPC-XXXXXXXX`)
2. Call the Zigo API to create the guide externally
3. Store both the local guide data and Zigo response
4. Return the created guide with Zigo tracking info

**Zigo API Details:**
- Auth: POST `https://dev-api-entregas.zigo.com.gt:443/auth/login`
- Create Guide: POST `https://dev-api-entregas.zigo.com.gt:443/guide`
- API Key: `ZG!eA#CHy2E!`
- Credentials: Use ZIGO_USERNAME/ZIGO_PASSWORD env vars

## Notes

- All list endpoints should support: skip, limit, q (versatile search), search
- Custom actions use: /api/v1/{resource}/{id}/actions/{action_name}
