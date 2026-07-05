"""Request-scoped middleware: structured access logging + tenant-context hygiene.

Each request is logged once (method, path, status, duration). The tenant ContextVar
is reset at the start of every request so a value can never linger from a previously
handled request that happened to reuse the same execution context — defence in depth
on top of per-request context isolation and the fact that ``get_current_user`` sets a
fresh value on every authenticated request.
"""

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from tenancy import reset_current_org_id, try_get_current_org_id

logger = logging.getLogger("planora.request")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        reset_current_org_id()
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)

        logger.info(
            "%s %s -> %s (%sms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            extra={
                "action": "http_request",
                "organization_id": try_get_current_org_id(),
            },
        )
        return response
