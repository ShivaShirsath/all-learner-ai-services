import * as http from 'node:http';
import * as https from 'node:https';
import { createHash } from 'node:crypto';
import * as jose from 'jose';

export const getEncryptionKey = (): Uint8Array => {
  const encKeyStr = process.env.JOSE_ENCRYPTION_PRIVATE_KEY;
  if (encKeyStr) {
    return jose.base64url.decode(encKeyStr);
  }
  const secretKey = process.env.JOSE_SECRET || '';
  return createHash('sha256').update(secretKey).digest();
};

export const getSigningKey = (): Uint8Array => {
  const signinKeyStr = process.env.JOSE_SIGNIN_PRIVATE_KEY || '';
  return new TextEncoder().encode(signinKeyStr);
};

export class AuthServiceUnavailableError extends Error {
  public readonly code?: string;
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AuthServiceUnavailableError';
    this.code = (cause as { code?: string } | undefined)?.code;
  }
}

// Reused connections to axl-login-service. Without an agent, Node 16 opens a
// new TCP (and TLS) connection for every API request's token check.
const keepAliveHttpAgent = new http.Agent({ keepAlive: true, maxSockets: 256 });
const keepAliveHttpsAgent = new https.Agent({ keepAlive: true, maxSockets: 256 });

const envInt = (name: string, fallback: number): number => {
  const n = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

function logAuthServiceEvent(
  event: string,
  fields: Record<string, unknown>,
): void {
  console.error(
    JSON.stringify({
      level: 'error',
      event,
      ts: new Date().toISOString(),
      ...fields,
    }),
  );
}

export const postJson = <T = any>(
  urlStr: string,
  body: unknown,
  timeoutMs: number = envInt('AUTH_SERVICE_TIMEOUT_MS', 3000),
): Promise<T | null> => {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const data = JSON.stringify(body);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;
      const req = transport.request(
        url,
        {
          method: 'POST',
          agent: isHttps ? keepAliveHttpsAgent : keepAliveHttpAgent,
          // Previously no timeout: a slow login-service held every API
          // request open until the gateway returned 504.
          timeout: timeoutMs,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
          },
        },
        (res) => {
          let responseBody = '';
          res.on('data', (chunk) => {
            responseBody += chunk;
          });
          res.on('end', () => {
            const statusCode = res.statusCode ?? 0;
            if (statusCode < 200 || statusCode >= 300) {
              logAuthServiceEvent('auth_service_unexpected_status', {
                url: urlStr,
                statusCode,
                bodySnippet: responseBody.slice(0, 200),
              });
              reject(
                new AuthServiceUnavailableError(
                  `Auth service responded with unexpected status ${statusCode}`,
                ),
              );
              return;
            }
            try {
              const parsed = JSON.parse(responseBody);
              resolve(parsed);
            } catch (parseErr) {
              logAuthServiceEvent('auth_service_invalid_response', {
                url: urlStr,
                statusCode,
                bodySnippet: responseBody.slice(0, 200),
                error:
                  parseErr instanceof Error
                    ? parseErr.message
                    : String(parseErr),
              });
              reject(
                new AuthServiceUnavailableError(
                  'Auth service returned an invalid response',
                  parseErr,
                ),
              );
            }
          });
        },
      );
      req.on('timeout', () => {
        const err: NodeJS.ErrnoException = new Error(
          `Auth service did not respond within ${timeoutMs} ms`,
        );
        err.code = 'ETIMEDOUT';
        (req as any).destroy?.(err); // emits 'error' below
      });
      req.on('error', (err: NodeJS.ErrnoException) => {
        logAuthServiceEvent('auth_service_unreachable', {
          url: urlStr,
          errorCode: err.code ?? null,
          error: err.message,
        });
        reject(new AuthServiceUnavailableError('Auth service is unreachable', err));
      });
      req.write(data);
      req.end();
    } catch (err) {
      logAuthServiceEvent('auth_service_request_setup_failed', {
        url: urlStr,
        error: err instanceof Error ? err.message : String(err),
      });
      reject(
        new AuthServiceUnavailableError(
          'Auth service request could not be constructed',
          err,
        ),
      );
    }
  });
};

// Optional short-lived cache of tokenStatus answers (per process).
// Every authenticated request calls axl-login-service, so that service's
// capacity caps every API. AUTH_TOKEN_STATUS_CACHE_TTL_MS > 0 answers repeat
// checks of the same token from memory for that long. Trade-off: a logout or
// a login on another device takes up to the TTL to take effect here.
// Default 0 = disabled (current behaviour). Errors are never cached.
const TOKEN_STATUS_CACHE_MAX_ENTRIES = 10000;
const tokenStatusCache = new Map<string, { isActive: boolean; expiresAt: number }>();

const tokenCacheKey = (userId: number | string, token: string): string =>
  createHash('sha256').update(`${userId}:${token}`).digest('base64');

export const clearTokenStatusCache = (): void => tokenStatusCache.clear();

// Checks whether `token` is the user's currently active session token, by asking
// axl-login-service's tokenStatus API directly. Strictly no local fallback: either
// axl-login-service answers true/false, or this throws AuthServiceUnavailableError.
export const checkTokenStatus = async (
  userId: number | string,
  token: string,
): Promise<boolean> => {
  const loginServiceUrl = process.env.AXL_LOGIN_SERVICE_URL || '';
  const cacheTtlMs = envInt('AUTH_TOKEN_STATUS_CACHE_TTL_MS', 0);
  const cacheKey = cacheTtlMs > 0 ? tokenCacheKey(userId, token) : '';
  if (cacheTtlMs > 0) {
    const hit = tokenStatusCache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.isActive;
    }
  }

  try {
    const statusData: any = await postJson(loginServiceUrl, {
      user_id: Number(userId) || userId,
      token,
    });
    const isActive =
      statusData?.responseObj?.responseDataParams?.data?.isActive ??
      statusData?.data?.isActive ??
      statusData?.isActive ??
      false;
    if (cacheTtlMs > 0) {
      if (tokenStatusCache.size >= TOKEN_STATUS_CACHE_MAX_ENTRIES) {
        // Map keeps insertion order: drop the oldest entry.
        tokenStatusCache.delete(tokenStatusCache.keys().next().value);
      }
      tokenStatusCache.set(cacheKey, {
        isActive: Boolean(isActive),
        expiresAt: Date.now() + cacheTtlMs,
      });
    }
    return Boolean(isActive);
  } catch (err) {
    logAuthServiceEvent('auth_service_check_failed', {
      url: loginServiceUrl,
      userId,
      errorCode:
        err instanceof AuthServiceUnavailableError ? err.code ?? null : null,
      error: err instanceof Error ? err.message : String(err),
    });
    if (err instanceof AuthServiceUnavailableError) {
      throw err;
    }
    throw new AuthServiceUnavailableError(
      'Not able to connect with axl-login-service',
      err,
    );
  }
};
