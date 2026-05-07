"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// Temporary script: temp_create_admin.ts
var supabase_js_1 = require("@supabase/supabase-js");
var dotenv_1 = require("dotenv");
var path_1 = require("path");
// Load environment variables from .env files
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env.local') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env.vercel') });
var supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
var serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
    console.error('❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment or .env files');
    process.exit(1);
}
var supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});
function createOrUpdateAdmin() {
    return __awaiter(this, void 0, void 0, function () {
        var ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, userId, _a, users, listError, existingUser, _b, newUser, newUserError, profileError, error_1;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    ADMIN_EMAIL = 'dharmadkunwar20@gmail.com';
                    ADMIN_PASSWORD = 'ddK152207';
                    ADMIN_NAME = 'Admin User';
                    console.log('🚀 Attempting to create or update Admin User: ' + ADMIN_EMAIL + '...');
                    userId = null;
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, supabaseAdmin.auth.admin.listUsers()];
                case 2:
                    _a = _d.sent(), users = _a.data, listError = _a.error;
                    if (listError) {
                        throw new Error('Error listing users: ' + listError.message);
                    }
                    existingUser = users.find(function (user) { return user.email === ADMIN_EMAIL; });
                    if (!(existingUser && existingUser.id)) return [3 /*break*/, 3];
                    userId = existingUser.id;
                    console.log('ℹ️ User ' + ADMIN_EMAIL + ' already exists with ID: ' + userId + '. Updating profile.');
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, supabaseAdmin.auth.admin.createUser({
                        email: ADMIN_EMAIL,
                        password: ADMIN_PASSWORD,
                        email_confirm: true,
                        user_metadata: { role: 'Admin' }
                    })];
                case 4:
                    _b = _d.sent(), newUser = _b.data, newUserError = _b.error;
                    if (newUserError) {
                        throw new Error('Auth user creation failed: ' + newUserError.message);
                    }
                    userId = (_c = newUser.user) === null || _c === void 0 ? void 0 : _c.id;
                    console.log('✅ Auth user created successfully. ID: ' + userId);
                    _d.label = 5;
                case 5: return [4 /*yield*/, supabaseAdmin
                        .from('profiles')
                        .upsert({
                        id: userId,
                        full_name: ADMIN_NAME,
                        avatar_url: "https://ui-avatars.com/api/?name=".concat(encodeURIComponent(ADMIN_NAME), "&background=6366f1"),
                        role: 'Admin',
                        last_seen: new Date().toISOString()
                    })];
                case 6:
                    profileError = (_d.sent()).error;
                    if (profileError) {
                        throw new Error('Profile upsert failed: ' + profileError.message);
                    }
                    console.log('✅ Admin profile linked and updated in public.profiles.');
                    console.log('🔑 LOGIN DETAILS:');
                    console.log('   Email: ' + ADMIN_EMAIL);
                    console.log('   Password: ' + ADMIN_PASSWORD);
                    console.log('📝 NOTE: Use these credentials to sign in.');
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _d.sent();
                    console.error('❌ Admin creation or update failed:', error_1.message);
                    process.exit(1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
createOrUpdateAdmin();
