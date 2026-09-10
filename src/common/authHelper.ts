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
): Promise<T | null> => {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const data = JSON.stringify(body);
      const transport = url.protocol === 'https:' ? https : http;
      const req = transport.request(
        url,
        {
          method: 'POST',
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

// Checks whether `token` is the user's currently active session token, by asking
// axl-login-service's tokenStatus API directly. Strictly no local fallback: either
// axl-login-service answers true/false, or this throws AuthServiceUnavailableError.
export const checkTokenStatus = async (
  userId: number | string,
  token: string,
): Promise<boolean> => {
  const loginServiceUrl = process.env.AXL_LOGIN_SERVICE_URL || '';
  const orcServiceUrl = process.env.ALL_ORC_SERVICE_URL || '';

  if (!loginServiceUrl && !orcServiceUrl) {
    throw new AuthServiceUnavailableError(
      'Not able to connect with axl-login-service',
    );
  }

  let lastError: unknown = null;

  // 1. Try axl-login-service
  if (loginServiceUrl) {
    try {
      const statusData: any = await postJson(loginServiceUrl, {
        user_id: Number(userId) || userId,
        token,
      });

      const activeToken =
        statusData?.responseObj?.responseDataParams?.data?.token ??
        statusData?.data?.token ??
        statusData?.token ??
        null;
      if (activeToken) {
        return activeToken === token;
      }

      const isActive =
        statusData?.responseObj?.responseDataParams?.data?.isActive ??
        statusData?.data?.isActive ??
        statusData?.isActive;
      if (typeof isActive === 'boolean') {
        return isActive;
      }
    } catch (err) {
      lastError = err;
      logAuthServiceEvent('auth_service_check_failed', {
        url: loginServiceUrl,
        userId,
        errorCode:
          err instanceof AuthServiceUnavailableError ? err.code ?? null : null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 2. Fallback to all-orchestration-service
  if (orcServiceUrl) {
    try {
      const orcData: any = await postJson(orcServiceUrl, {
        user_id: Number(userId) || userId,
        token,
      });

      const isActive =
        orcData?.result?.isActive ??
        orcData?.responseObj?.responseDataParams?.data?.isActive ??
        orcData?.data?.isActive ??
        orcData?.isActive ??
        false;
      return Boolean(isActive);
    } catch (err) {
      logAuthServiceEvent('orc_service_check_failed', {
        url: orcServiceUrl,
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (lastError instanceof AuthServiceUnavailableError && !orcServiceUrl) {
    throw lastError;
  }
  if (lastError && !orcServiceUrl) {
    throw new AuthServiceUnavailableError(
      'Not able to connect with axl-login-service',
      lastError,
    );
  }

  return false;
};
