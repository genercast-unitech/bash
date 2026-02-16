
import { WhatsAppChatApp } from './WhatsAppCore.js';

/**
 * Simplified Config Panel for the Menu Page
 * As requested: "apenas pra logar ou deslogar"
 */
export const ConfigPanel = (containerId) => {
    // We use the simplified 'auth-only' mode for the menu page
    return WhatsAppChatApp(containerId, { mode: 'auth-only' });
};
