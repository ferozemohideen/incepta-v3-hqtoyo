/**
 * @fileoverview Enhanced Authentication Controller
 * Implements secure authentication endpoints with comprehensive security features
 * including MFA, OAuth, rate limiting, and audit logging.
 * @version 1.0.0
 */

import { Request, Response } from 'express'; // ^4.18.2
import { StatusCodes } from 'http-status-codes'; // ^2.2.0
import DeviceDetector from 'device-detector-js'; // ^3.0.0
import { RateLimiterMemory } from 'rate-limiter-flexible'; // ^2.3.0
import { AuthService } from '../../services/auth.service';
import { 
  LoginRequest, 
  MFAVerifyRequest, 
  AuthAuditLog,
  UserSession 
} from '../../interfaces/auth.interface';
import { UserRole } from '../../constants/roles';

/**
 * Enhanced authentication controller implementing comprehensive security features
 * and following enterprise security best practices.
 */
export class AuthController {
  private readonly deviceDetector: DeviceDetector;
  private readonly rateLimiter: RateLimiterMemory;

  constructor(
    private readonly authService: AuthService,
    rateLimiter?: RateLimiterMemory
  ) {
    this.deviceDetector = new DeviceDetector();
    this.rateLimiter = rateLimiter || new RateLimiterMemory({
      points: 5,
      duration: 60 * 15, // 15 minutes
      blockDuration: 60 * 60 // 1 hour block
    });
  }

  /**
   * Enhanced login handler with comprehensive security validations
   * @param req Express request object containing login credentials
   * @param res Express response object
   * @returns Promise<Response> HTTP response with login result
   */
  public login = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Extract request data
      const { email, password, mfaToken, clientId, clientSecret } = req.body;
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.ip;

      // Validate required fields
      if (!email || !password) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Email and password are required'
        });
      }

      // Device fingerprinting
      const device = this.deviceDetector.parse(userAgent);
      const deviceFingerprint = await this.generateDeviceFingerprint(req);

      // Prepare login request
      const loginRequest: LoginRequest = {
        email,
        password,
        mfaToken,
        deviceFingerprint,
        clientId,
        clientSecret,
        grantType: 'password'
      };

      // Attempt login with security context
      const loginResponse = await this.authService.login(loginRequest, {
        ip,
        userAgent
      });

      // Set secure cookie with refresh token if login successful
      if (loginResponse.refreshToken) {
        res.cookie('refreshToken', loginResponse.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
      }

      return res.status(StatusCodes.OK).json({
        accessToken: loginResponse.accessToken,
        user: loginResponse.user,
        requiresMFA: loginResponse.requiresMFA,
        expiresIn: loginResponse.expiresIn,
        tokenType: loginResponse.tokenType
      });

    } catch (error) {
      return this.handleAuthError(error, res);
    }
  };

  /**
   * Enhanced token refresh with security validations
   * @param req Express request object containing refresh token
   * @param res Express response object
   * @returns Promise<Response> HTTP response with new access token
   */
  public refreshToken = async (req: Request, res: Response): Promise<Response> => {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      const deviceFingerprint = await this.generateDeviceFingerprint(req);

      if (!refreshToken) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Refresh token is required'
        });
      }

      const tokens = await this.authService.refreshToken(refreshToken, {
        deviceFingerprint,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || ''
      });

      // Update secure cookie with new refresh token
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.status(StatusCodes.OK).json({
        accessToken: tokens.accessToken,
        expiresIn: 900 // 15 minutes
      });

    } catch (error) {
      return this.handleAuthError(error, res);
    }
  };

  /**
   * Enhanced MFA setup endpoint with QR code generation
   * @param req Express request object
   * @param res Express response object
   * @returns Promise<Response> HTTP response with MFA setup data
   */
  public setupMFA = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.user.id; // Extracted from JWT middleware
      const deviceFingerprint = await this.generateDeviceFingerprint(req);

      const mfaSetup = await this.authService.setupMFA(userId, {
        fingerprint: deviceFingerprint,
        userAgent: req.headers['user-agent'] || ''
      });

      return res.status(StatusCodes.OK).json({
        qrCode: mfaSetup.qrCode,
        backupCodes: mfaSetup.backupCodes,
        recoveryCodes: mfaSetup.recoveryCodes
      });

    } catch (error) {
      return this.handleAuthError(error, res);
    }
  };

  /**
   * Enhanced OAuth callback handler with security validations
   * @param req Express request object containing OAuth data
   * @param res Express response object
   * @returns Promise<Response> HTTP response with OAuth result
   */
  public handleOAuthCallback = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { code, state } = req.query;
      const deviceFingerprint = await this.generateDeviceFingerprint(req);

      if (!code || !state) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Invalid OAuth callback parameters'
        });
      }

      const result = await this.authService.handleOAuthCallback({
        code: code.toString(),
        state: state.toString(),
        deviceFingerprint,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || ''
      });

      // Set secure cookie with refresh token
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.status(StatusCodes.OK).json({
        accessToken: result.accessToken,
        user: result.user,
        expiresIn: result.expiresIn,
        tokenType: result.tokenType
      });

    } catch (error) {
      return this.handleAuthError(error, res);
    }
  };

  /**
   * Generates a unique device fingerprint from request data
   * @param req Express request object
   * @returns Promise<string> Device fingerprint
   */
  private async generateDeviceFingerprint(req: Request): Promise<string> {
    const device = this.deviceDetector.parse(req.headers['user-agent'] || '');
    return this.authService.generateDeviceFingerprint(
      JSON.stringify(device),
      req.ip
    );
  }

  /**
   * Standardized error handler for authentication errors
   * @param error Error object
   * @param res Express response object
   * @returns Response with appropriate error status and message
   */
  private handleAuthError(error: any, res: Response): Response {
    const errorMessage = error.message || 'An authentication error occurred';
    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;

    // Log error for security monitoring
    console.error('Authentication Error:', {
      message: errorMessage,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return res.status(statusCode).json({
      error: errorMessage,
      code: error.code || 'AUTH_ERROR'
    });
  }
}