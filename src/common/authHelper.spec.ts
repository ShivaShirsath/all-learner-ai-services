import * as http from 'node:http';
import * as https from 'node:https';
import { EventEmitter } from 'node:events';
import * as jose from 'jose';
import {
  getEncryptionKey,
  getSigningKey,
  postJson,
  checkTokenStatus,
} from './authHelper';

jest.mock('jose', () => ({
  base64url: {
    decode: jest.fn(),
  },
  jwtDecrypt: jest.fn(),
  jwtVerify: jest.fn(),
}));

describe('authHelper', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getEncryptionKey', () => {
    it('should decode base64url if JWT_ENCRYPTION_PRIVATE_KEY is set', () => {
      process.env.JWT_ENCRYPTION_PRIVATE_KEY = 'base64-encoded-key';
      const mockDecoded = new Uint8Array([1, 2, 3]);
      (jose.base64url.decode as jest.Mock).mockReturnValue(mockDecoded);

      const result = getEncryptionKey();
      expect(jose.base64url.decode).toHaveBeenCalledWith('base64-encoded-key');
      expect(result).toBe(mockDecoded);
    });

    it('should fallback to sha256 hash of JOSE_SECRET if JWT_ENCRYPTION_PRIVATE_KEY is not set', () => {
      delete process.env.JWT_ENCRYPTION_PRIVATE_KEY;
      process.env.JOSE_SECRET = 'my-secret';

      const result = getEncryptionKey();
      expect(result).toBeInstanceOf(Buffer);
      expect(result).toHaveLength(32);
    });

    it('should handle empty JOSE_SECRET fallback when neither is set', () => {
      delete process.env.JWT_ENCRYPTION_PRIVATE_KEY;
      delete process.env.JOSE_SECRET;

      const result = getEncryptionKey();
      expect(result).toBeInstanceOf(Buffer);
      expect(result).toHaveLength(32);
    });
  });

  describe('getSigningKey', () => {
    it('should encode JWT_SIGNIN_PRIVATE_KEY into Uint8Array', () => {
      process.env.JWT_SIGNIN_PRIVATE_KEY = 'secret-signin-key';
      const result = getSigningKey();
      expect(result).toEqual(new TextEncoder().encode('secret-signin-key'));
    });

    it('should handle missing JWT_SIGNIN_PRIVATE_KEY', () => {
      delete process.env.JWT_SIGNIN_PRIVATE_KEY;
      const result = getSigningKey();
      expect(result).toEqual(new TextEncoder().encode(''));
    });
  });

  describe('postJson', () => {
    it('should perform http POST request and resolve parsed response', async () => {
      const mockReq = Object.assign(new EventEmitter(), {
        write: jest.fn(),
        end: jest.fn(),
      });
      const mockRes = new EventEmitter();

      const requestSpy = jest
        .spyOn(http, 'request')
        .mockImplementation((_url: any, _options: any, callback?: any) => {
          if (callback) callback(mockRes);
          return mockReq as any;
        });

      const promise = postJson('http://example.com/api', { foo: 'bar' });

      mockRes.emit('data', JSON.stringify({ success: true }));
      mockRes.emit('end');

      const result = await promise;
      expect(result).toEqual({ success: true });
      expect(mockReq.write).toHaveBeenCalled();
      expect(mockReq.end).toHaveBeenCalled();
      requestSpy.mockRestore();
    });

    it('should use https module when url protocol is https', async () => {
      const mockReq = Object.assign(new EventEmitter(), {
        write: jest.fn(),
        end: jest.fn(),
      });
      const mockRes = new EventEmitter();

      const requestSpy = jest
        .spyOn(https, 'request')
        .mockImplementation((_url: any, _options: any, callback?: any) => {
          if (callback) callback(mockRes);
          return mockReq as any;
        });

      const promise = postJson('https://example.com/api', { foo: 'bar' });

      mockRes.emit('data', JSON.stringify({ success: true }));
      mockRes.emit('end');

      const result = await promise;
      expect(result).toEqual({ success: true });
      requestSpy.mockRestore();
    });

    it('should reject when response is invalid JSON', async () => {
      const mockReq = Object.assign(new EventEmitter(), {
        write: jest.fn(),
        end: jest.fn(),
      });
      const mockRes = new EventEmitter();

      const requestSpy = jest
        .spyOn(http, 'request')
        .mockImplementation((_url: any, _options: any, callback?: any) => {
          if (callback) callback(mockRes);
          return mockReq as any;
        });

      const promise = postJson('http://example.com/api', { foo: 'bar' });

      mockRes.emit('data', 'invalid-json');
      mockRes.emit('end');

      await expect(promise).rejects.toThrow();
      requestSpy.mockRestore();
    });

    it('should reject on request network error', async () => {
      const mockReq = Object.assign(new EventEmitter(), {
        write: jest.fn(),
        end: jest.fn(),
      });

      const requestSpy = jest.spyOn(http, 'request').mockImplementation(() => {
        setTimeout(() => {
          mockReq.emit('error', new Error('Connection refused'));
        }, 5);
        return mockReq as any;
      });

      await expect(
        postJson('http://example.com/api', { foo: 'bar' }),
      ).rejects.toThrow('Connection refused');
      requestSpy.mockRestore();
    });

    it('should reject on invalid URL string', async () => {
      await expect(postJson('not-a-valid-url', {})).rejects.toThrow();
    });
  });

  describe('checkTokenStatus', () => {
    it('should return isActive true when orchestration service returns result.isActive = true', async () => {
      process.env.ALL_ORC_SERVICE_URL =
        'http://points-lesson-tracking:3009/api/virtualId/tokenStatus';
      delete process.env.AXL_LOGIN_SERVICE_URL;

      const mockReq = Object.assign(new EventEmitter(), {
        write: jest.fn(),
        end: jest.fn(),
      });
      const mockRes = new EventEmitter();

      const requestSpy = jest
        .spyOn(http, 'request')
        .mockImplementation((_url: any, _options: any, callback?: any) => {
          if (callback) callback(mockRes);
          return mockReq as any;
        });

      const promise = checkTokenStatus('12345', 'mock-token');

      mockRes.emit('data', JSON.stringify({ result: { isActive: true } }));
      mockRes.emit('end');

      const result = await promise;
      expect(result).toEqual({ isActive: true });
      requestSpy.mockRestore();
    });

    it('should return isActive true when orchestration service returns data.result.isActive = true', async () => {
      process.env.ALL_ORC_SERVICE_URL =
        'http://points-lesson-tracking:3009/api/virtualId/tokenStatus';

      const mockReq = Object.assign(new EventEmitter(), {
        write: jest.fn(),
        end: jest.fn(),
      });
      const mockRes = new EventEmitter();

      const requestSpy = jest
        .spyOn(http, 'request')
        .mockImplementation((_url: any, _options: any, callback?: any) => {
          if (callback) callback(mockRes);
          return mockReq as any;
        });

      const promise = checkTokenStatus('12345', 'mock-token');

      mockRes.emit(
        'data',
        JSON.stringify({ data: { result: { isActive: true } } }),
      );
      mockRes.emit('end');

      const result = await promise;
      expect(result).toEqual({ isActive: true });
      requestSpy.mockRestore();
    });

    it('should return isActive true when orchestration service returns direct isActive = true', async () => {
      process.env.ALL_ORC_SERVICE_URL =
        'http://points-lesson-tracking:3009/api/virtualId/tokenStatus';

      const mockReq = Object.assign(new EventEmitter(), {
        write: jest.fn(),
        end: jest.fn(),
      });
      const mockRes = new EventEmitter();

      const requestSpy = jest
        .spyOn(http, 'request')
        .mockImplementation((_url: any, _options: any, callback?: any) => {
          if (callback) callback(mockRes);
          return mockReq as any;
        });

      const promise = checkTokenStatus('12345', 'mock-token');

      mockRes.emit('data', JSON.stringify({ isActive: true }));
      mockRes.emit('end');

      const result = await promise;
      expect(result).toEqual({ isActive: true });
      requestSpy.mockRestore();
    });

    it('should return isActive true when login service returns token at root level with non-numeric userId', async () => {
      delete process.env.ALL_ORC_SERVICE_URL;
      process.env.AXL_LOGIN_SERVICE_URL = 'http://axl-login-service:8000';

      const mockReq = Object.assign(new EventEmitter(), {
        write: jest.fn(),
        end: jest.fn(),
      });
      const mockRes = new EventEmitter();

      const requestSpy = jest
        .spyOn(http, 'request')
        .mockImplementation((_url: any, _options: any, callback?: any) => {
          if (callback) callback(mockRes);
          return mockReq as any;
        });

      const promise = checkTokenStatus('user-alpha', 'root-token');

      mockRes.emit('data', JSON.stringify({ token: 'root-token' }));
      mockRes.emit('end');

      const result = await promise;
      expect(result).toEqual({ isActive: true });
      requestSpy.mockRestore();
    });

    it('should return isActive true when login service returns matching token', async () => {
      delete process.env.ALL_ORC_SERVICE_URL;
      process.env.AXL_LOGIN_SERVICE_URL = 'http://axl-login-service:8000';

      const mockReq = Object.assign(new EventEmitter(), {
        write: jest.fn(),
        end: jest.fn(),
      });
      const mockRes = new EventEmitter();

      const requestSpy = jest
        .spyOn(http, 'request')
        .mockImplementation((_url: any, _options: any, callback?: any) => {
          if (callback) callback(mockRes);
          return mockReq as any;
        });

      const promise = checkTokenStatus('12345', 'target-token');

      mockRes.emit(
        'data',
        JSON.stringify({
          responseObj: {
            responseDataParams: {
              data: {
                token: 'target-token',
              },
            },
          },
        }),
      );
      mockRes.emit('end');

      const result = await promise;
      expect(result).toEqual({ isActive: true });
      requestSpy.mockRestore();
    });

    it('should return isActive false when login service returns mismatched token', async () => {
      delete process.env.ALL_ORC_SERVICE_URL;
      process.env.AXL_LOGIN_SERVICE_URL = 'http://axl-login-service:8000';

      const mockReq = Object.assign(new EventEmitter(), {
        write: jest.fn(),
        end: jest.fn(),
      });
      const mockRes = new EventEmitter();

      const requestSpy = jest
        .spyOn(http, 'request')
        .mockImplementation((_url: any, _options: any, callback?: any) => {
          if (callback) callback(mockRes);
          return mockReq as any;
        });

      const promise = checkTokenStatus('12345', 'different-token');

      mockRes.emit(
        'data',
        JSON.stringify({
          data: {
            token: 'target-token',
          },
        }),
      );
      mockRes.emit('end');

      const result = await promise;
      expect(result).toEqual({ isActive: false });
      requestSpy.mockRestore();
    });

    it('should fallback gracefully to login service if orchestration service throws error', async () => {
      process.env.ALL_ORC_SERVICE_URL =
        'http://points-lesson-tracking:3009/api/virtualId/tokenStatus';
      process.env.AXL_LOGIN_SERVICE_URL = 'http://axl-login-service:8000';

      let callCount = 0;
      const requestSpy = jest
        .spyOn(http, 'request')
        .mockImplementation((_url: any, _options: any, callback?: any) => {
          callCount++;
          const mockReq = Object.assign(new EventEmitter(), {
            write: jest.fn(),
            end: jest.fn(),
            setHeader: jest.fn(),
          });
          const mockRes = new EventEmitter();

          if (callCount === 1) {
            setTimeout(() => {
              mockReq.emit('error', new Error('Orc network error'));
            }, 5);
          } else {
            if (callback) callback(mockRes);
            setTimeout(() => {
              mockRes.emit(
                'data',
                JSON.stringify({
                  token: 'my-token',
                }),
              );
              mockRes.emit('end');
            }, 5);
          }
          return mockReq as any;
        });

      const result = await checkTokenStatus('12345', 'my-token');
      expect(result).toEqual({ isActive: true });
      requestSpy.mockRestore();
    });

    it('should return isActive false if both services are unavailable or fail', async () => {
      process.env.ALL_ORC_SERVICE_URL =
        'http://points-lesson-tracking:3009/api/virtualId/tokenStatus';
      process.env.AXL_LOGIN_SERVICE_URL = 'http://axl-login-service:8000';

      const requestSpy = jest.spyOn(http, 'request').mockImplementation(() => {
        const mockReq = Object.assign(new EventEmitter(), {
          write: jest.fn(),
          end: jest.fn(),
        });
        setTimeout(() => {
          mockReq.emit('error', new Error('Network error'));
        }, 5);
        return mockReq as any;
      });

      const result = await checkTokenStatus('12345', 'my-token');
      expect(result).toEqual({ isActive: false });
      requestSpy.mockRestore();
    });

    it('should return isActive false if no URLs are configured', async () => {
      delete process.env.ALL_ORC_SERVICE_URL;
      delete process.env.AXL_LOGIN_SERVICE_URL;

      const result = await checkTokenStatus('12345', 'my-token');
      expect(result).toEqual({ isActive: false });
    });
  });
});
