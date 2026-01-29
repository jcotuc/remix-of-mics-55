# Backend API Gaps

This document tracks missing backend endpoints that the frontend requires.

## Missing Endpoints (add to FastAPI)

| Endpoint | Method | Purpose | Request Body | Response |
|----------|--------|---------|--------------|----------|
| `/api/v1/incidentes/mis-asignaciones/` | GET | List incidents assigned to current user | - | `{ results: Incidente[], total: number }` |
| `/api/v1/preguntas-auditoria/` | GET | List audit questions with ?seccion=&activo= | - | `{ results: PreguntaAuditoria[] }` |
| `/api/v1/auditoria-respuestas/batch` | POST | Batch create audit responses | `{ auditoria_id, respuestas: [...] }` | created records |
| `/api/v1/verificaciones-reincidencia/` | GET/POST | CRUD for recurrence verifications | varies | `{ results: [...] }` or created record |

## Notes

- All list endpoints should support: skip, limit, q (versatile search)
- Custom actions use: /api/v1/{resource}/{id}/actions/{action_name}
