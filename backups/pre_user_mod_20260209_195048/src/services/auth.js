import { storage } from './storage.js';
import { audit } from './audit.js';
import { encryption } from './encryption.js';
import { errorHandler, AuthenticationError, AuthorizationError } from '../utils/errorHandler.js';

/**
 * Enhanced AuthService with password hashing, rate limiting, and session management
 */
export class AuthService {
    constructor() {
        this.currentUser = null;
        this.sessionToken = null;
        this.sessionExpiry = null;
        this.loginAttempts = new Map(); // Track login attempts for rate limiting
        this.maxAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        this.sessionDuration = 8 * 60 * 60 * 1000; // 8 hours

        this.init();
    }

    /**
     * Initialize authentication service
     */
    init() {
        try {
            const sessionData = localStorage.getItem('unitech_session');
            if (sessionData) {
                const session = JSON.parse(sessionData);

                // Check if session is valid and not expired
                if (session.expiry && new Date(session.expiry) > new Date()) {
                    this.currentUser = session.user;
                    this.sessionToken = session.token;
                    this.sessionExpiry = new Date(session.expiry);
                } else {
                    // Session expired, clear it
                    this.clearSession();
                }
            }
        } catch (e) {
            console.error('Session initialization error:', e);
            this.clearSession();
        }

        // Set up session expiry check
        this.setupSessionCheck();
    }

    /**
     * Login with enhanced security
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Object} Login result
     */
    async login(email, password) {
        try {
            // Check rate limiting
            if (this.isRateLimited(email)) {
                const lockoutEnd = this.loginAttempts.get(email).lockoutEnd;
                const remainingTime = Math.ceil((lockoutEnd - Date.now()) / 60000);

                audit.log('LOGIN_RATE_LIMITED', 'User', 'N/A', { email });

                return {
                    success: false,
                    message: `Muitas tentativas falhadas. Tente novamente em ${remainingTime} minutos.`
                };
            }

            // Search ALL users across ALL tenants to allow login
            const users = storage.getGlobalUsers();

            // Find user by email
            const user = users.find(u => u.email === email);

            if (!user) {
                this.recordFailedAttempt(email);
                audit.log('LOGIN_FAILED', 'User', 'N/A', { email, reason: 'User not found' });
                return { success: false, message: 'Credenciais inválidas' };
            }

            // Verify password (support both hashed and legacy plain-text)
            let passwordValid = false;

            if (user.passwordHash) {
                // New hashed password
                passwordValid = await encryption.verifyPassword(password, user.passwordHash);
            } else {
                // Legacy plain-text password - verify and migrate
                passwordValid = user.password === password;

                if (passwordValid) {
                    // Migrate to hashed password
                    const passwordHash = await encryption.hashPassword(password);
                    storage.updateUser({
                        ...user,
                        passwordHash: passwordHash,
                        password: undefined // Remove plain-text password
                    });
                }
            }

            if (!passwordValid) {
                this.recordFailedAttempt(email);
                audit.log('LOGIN_FAILED', 'User', user.id, { email, reason: 'Invalid password' });
                return { success: false, message: 'Credenciais inválidas' };
            }

            // Check user status
            if (user.status === 'suspended') {
                audit.log('LOGIN_BLOCKED', 'User', user.id, { email: user.email, reason: 'Suspended Account' });
                return { success: false, message: 'Conta SUSPENSA. Entre em contato com o suporte.' };
            }

            // Clear login attempts on successful login
            this.loginAttempts.delete(email);

            // Create session
            this.createSession(user);

            // AUDIT LOG
            audit.log('LOGIN', 'User', user.id, {
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                timestamp: new Date().toISOString()
            });

            return { success: true, user: this.currentUser };

        } catch (error) {
            errorHandler.handle(error, { module: 'Auth', action: 'login' });
            return { success: false, message: 'Erro ao processar login. Tente novamente.' };
        }
    }

    /**
     * Create a new session for the user
     * @private
     */
    createSession(user) {
        // Generate session token
        this.sessionToken = encryption.generateToken(32);
        this.sessionExpiry = new Date(Date.now() + this.sessionDuration);

        // Remove sensitive data before storing
        const { password, passwordHash, ...safeUser } = user;
        this.currentUser = safeUser;

        // Store session
        const sessionData = {
            user: safeUser,
            token: this.sessionToken,
            expiry: this.sessionExpiry.toISOString(),
            createdAt: new Date().toISOString()
        };

        try {
            localStorage.setItem('unitech_session', JSON.stringify(sessionData));

            // Also keep legacy support
            localStorage.setItem('unitech_current_user', JSON.stringify(safeUser));
        } catch (e) {
            console.error('Session storage error:', e);
        }
    }

    /**
     * Check if email is rate limited
     * @private
     */
    isRateLimited(email) {
        const attempts = this.loginAttempts.get(email);

        if (!attempts) return false;

        // Check if lockout period has expired
        if (attempts.lockoutEnd && attempts.lockoutEnd > Date.now()) {
            return true;
        }

        // Reset if lockout expired
        if (attempts.lockoutEnd && attempts.lockoutEnd <= Date.now()) {
            this.loginAttempts.delete(email);
            return false;
        }

        return false;
    }

    /**
     * Record failed login attempt
     * @private
     */
    recordFailedAttempt(email) {
        const attempts = this.loginAttempts.get(email) || { count: 0, firstAttempt: Date.now() };

        attempts.count++;
        attempts.lastAttempt = Date.now();

        if (attempts.count >= this.maxAttempts) {
            attempts.lockoutEnd = Date.now() + this.lockoutDuration;
            audit.log('LOGIN_LOCKOUT', 'User', 'N/A', {
                email,
                attempts: attempts.count,
                lockoutDuration: this.lockoutDuration / 60000 + ' minutes'
            });
        }

        this.loginAttempts.set(email, attempts);
    }

    /**
     * Setup session expiry check
     * @private
     */
    setupSessionCheck() {
        // Check session every minute
        setInterval(() => {
            if (this.currentUser && this.sessionExpiry) {
                if (new Date() > this.sessionExpiry) {
                    console.log('Session expired');
                    this.logout(true);
                }
            }
        }, 60000); // Check every minute
    }

    /**
     * Logout user
     * @param {boolean} sessionExpired - Whether logout is due to session expiration
     */
    logout(sessionExpired = false) {
        if (this.currentUser) {
            audit.log('LOGOUT', 'User', this.currentUser.id, {
                email: this.currentUser.email,
                reason: sessionExpired ? 'Session Expired' : 'Manual Logout'
            });
        }

        this.clearSession();

        if (sessionExpired) {
            alert('Sua sessão expirou. Por favor, faça login novamente.');
        }

        window.location.reload();
    }

    /**
     * Clear session data
     * @private
     */
    clearSession() {
        this.currentUser = null;
        this.sessionToken = null;
        this.sessionExpiry = null;

        try {
            localStorage.removeItem('unitech_session');
            localStorage.removeItem('unitech_current_user');
        } catch (e) {
            console.error('Error clearing session:', e);
        }
    }

    /**
     * Get current user
     * @returns {Object|null} Current user object
     */
    getUser() {
        return this.currentUser;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if authenticated
     */
    isAuthenticated() {
        if (!this.currentUser) return false;

        // Check session expiry
        if (this.sessionExpiry && new Date() > this.sessionExpiry) {
            this.logout(true);
            return false;
        }

        return true;
    }

    /**
     * Refresh session (extend expiry)
     */
    refreshSession() {
        if (this.currentUser) {
            this.sessionExpiry = new Date(Date.now() + this.sessionDuration);

            try {
                const sessionData = JSON.parse(localStorage.getItem('unitech_session'));
                if (sessionData) {
                    sessionData.expiry = this.sessionExpiry.toISOString();
                    localStorage.setItem('unitech_session', JSON.stringify(sessionData));
                }
            } catch (e) {
                console.error('Error refreshing session:', e);
            }
        }
    }

    /**
     * Check if user has access to a module
     * @param {string} moduleName - Module name
     * @returns {boolean} True if user has access
     */
    hasAccess(moduleName) {
        if (!this.isAuthenticated()) return false;

        const role = this.currentUser.role;

        // Role-based access control
        const accessMatrix = {
            master: '*', // Full access
            admin: '*', // Full access (scoped to tenant)
            ceo: '*', // Full access
            manager: ['dashboard', 'sales', 'clients', 'storefront', 'checklist', 'warranty', 'copilot', 'vision', 'bench', 'compatibility', 'financial'],
            sales: ['dashboard', 'sales', 'clients', 'storefront', 'checklist', 'warranty', 'copilot'],
            tech: ['dashboard', 'vision', 'checklist', 'warranty', 'storefront', 'copilot', 'bench', 'compatibility'],
            client: ['storefront']
        };

        const allowedModules = accessMatrix[role];

        if (!allowedModules) return false;
        if (allowedModules === '*') return true;

        return allowedModules.includes(moduleName);
    }

    /**
     * Require authentication (throws error if not authenticated)
     * @throws {AuthenticationError} If not authenticated
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            throw new AuthenticationError();
        }
    }

    /**
     * Require specific role
     * @param {string|Array<string>} roles - Required role(s)
     * @throws {AuthorizationError} If user doesn't have required role
     */
    requireRole(roles) {
        this.requireAuth();

        const requiredRoles = Array.isArray(roles) ? roles : [roles];

        if (!requiredRoles.includes(this.currentUser.role)) {
            throw new AuthorizationError(`Acesso negado. Função requerida: ${requiredRoles.join(' ou ')}`);
        }
    }

    /**
     * Generate CSRF token for forms
     * @returns {string} CSRF token
     */
    generateCSRFToken() {
        const token = encryption.generateToken(16);
        sessionStorage.setItem('csrf_token', token);
        return token;
    }

    /**
     * Verify CSRF token
     * @param {string} token - Token to verify
     * @returns {boolean} True if valid
     */
    verifyCSRFToken(token) {
        const storedToken = sessionStorage.getItem('csrf_token');
        return storedToken === token;
    }
}

export const auth = new AuthService();
