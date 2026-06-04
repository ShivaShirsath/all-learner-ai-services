import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ErrorCodes } from 'src/common/exceptions/api.exceptions';
import { JwtService } from '@nestjs/jwt';
import axios, { isAxiosError } from 'axios';
import { createHash } from 'crypto';
import { Request } from 'express';
import * as jose from 'jose';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector, 
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {

    // Check for public routs
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );

    if (isPublic) {
      return true; 
    }
    
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header missing');
    }
    const token = authHeader.split(' ')[1];
    try {
    
      //Step 1: Correctly Generate Encryption Key
      const secret_key = process.env.JOSE_SECRET || '';
      const hash = new Uint8Array(createHash('sha256').update(secret_key).digest());

      //Step 2: Decrypt the Token
      const jwtDecryptedToken = await jose.jwtDecrypt(token, hash);

      if (!jwtDecryptedToken.payload.jwtSignedToken) {
        throw new Error('jwtSignedToken not found in decrypted payload');
      }

      //Step 3: Verify the Signed JWT
      const jwtSignedToken = String(jwtDecryptedToken.payload.jwtSignedToken);

      //Fix Signing Key
      const jwtSigninKey = new TextEncoder().encode(
        process.env.JWT_SIGNIN_PRIVATE_KEY,
      );
      const verifiedToken = await jose.jwtVerify(jwtSignedToken, jwtSigninKey);

      // get the token status (orchestration service)
      const tokenStatus = await this.checkTokenStatus(verifiedToken.payload.virtual_id, token);
      if (tokenStatus.error === 'orchestration_unavailable') {
        throw new HttpException(
          {
            code: ErrorCodes.ORCHESTRATION_UNAVAILABLE,
            message:
              'Cannot verify your session because the authentication service is unavailable. Please try again later.',
            upstream: 'orchestration',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      if (!tokenStatus.isActive) {
        throw new UnauthorizedException('User is logged out');
      }

      //Step 4: Attach User Data to Request
      (request as any).user = verifiedToken.payload;

      return true;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  // check user status
  async checkTokenStatus(
    user_id: any,
    token: string,
  ): Promise<{ isActive: boolean; error?: 'orchestration_unavailable' }> {
    try {
      const url = process.env.ALL_ORC_SERVICE_URL;
      if (!url) {
        throw new Error('ALL_ORC_SERVICE_URL is not configured');
      }
      const response = await axios.post(url, {
        user_id: user_id,
        token: token,
      });

      return {
        isActive: response.data?.result?.isActive === true,
      };
    } catch (error: any) {
      console.error(
        'Error calling token-status API:',
        error?.response?.data || error.message,
      );
      // Reachable orchestration that returns 4xx/5xx: treat like missing session token
      if (isAxiosError(error) && error.response) {
        return { isActive: false };
      }
      // Network / DNS / timeout / no URL: dependency down
      return {
        isActive: false,
        error: 'orchestration_unavailable',
      };
    }
  }
}
