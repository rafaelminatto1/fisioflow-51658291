"use strict";
/**
 * Admin Function: Create Firebase User
 * Executar uma vez para criar usuário inicial
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminUser = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const app_1 = require("firebase-admin/app");
const app_2 = require("firebase-admin/app");
// Initialize Firebase Admin
if (!(0, app_2.getApps)().length) {
    (0, app_1.initializeApp)();
}
exports.createAdminUser = (0, https_1.onCall)({ cors: true }, async () => {
    const auth = (0, auth_1.getAuth)();
    try {
        // Verificar se usuário já existe
        try {
            const existingUser = await auth.getUserByEmail('rafael.minatto@yahoo.com.br');
            return {
                success: true,
                message: 'Usuário já existe',
                uid: existingUser.uid,
                email: existingUser.email
            };
        }
        catch (e) {
            // Usuário não existe, continuar
        }
        // Criar novo usuário
        const user = await auth.createUser({
            email: 'rafael.minatto@yahoo.com.br',
            password: 'Yukari30@',
            emailVerified: true,
            displayName: 'Rafael Minatto',
        });
        return {
            success: true,
            message: 'Usuário criado com sucesso',
            uid: user.uid,
            email: user.email,
            loginUrl: 'https://fisioflow-migration.web.app/login'
        };
    }
    catch (error) {
        throw new Error(`Erro ao criar usuário: ${error.message}`);
    }
});
//# sourceMappingURL=create-user.js.map