import crypto from 'crypto';
/**
 * Basic CSRF protection using a token-based approach.
 * In a more complex setup, this would be tied to the session.
 */
export class CSRFProtection {
    /**
     * Generates a random CSRF token
     */
    static generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    /**
     * Middleware to verify CSRF token for mutating requests
     */
    static withCSRF(handler) {
        return async (req, res) => {
            const method = req.method?.toUpperCase();
            // Skip CSRF check for safe methods
            if (['GET', 'HEAD', 'OPTIONS'].includes(method || '')) {
                return handler(req, res);
            }
            const clientToken = req.headers['x-csrf-token'];
            const cookieToken = this.getTokenFromCookie(req);
            if (!clientToken || !cookieToken || clientToken !== cookieToken) {
                return res.status(403).json({
                    error: 'CSRF validation failed',
                    message: 'Invalid or missing CSRF token'
                });
            }
            return handler(req, res);
        };
    }
    static getTokenFromCookie(req) {
        if (!req.headers.cookie)
            return null;
        const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
            const [name, value] = cookie.trim().split('=');
            acc[name] = value;
            return acc;
        }, {});
        return cookies['csrf-token'] || null;
    }
}
CSRFProtection.TOKEN_SECRET = process.env.CSRF_SECRET || 'roadmaster-csrf-secret-2024';
