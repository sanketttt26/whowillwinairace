import { initBotId } from 'botid/client/core';

// Attaches the BotID challenge to ballot requests; /api/vote rejects requests without a passing one.
initBotId({ protect: [{ path: '/api/vote', method: 'POST' }] });
