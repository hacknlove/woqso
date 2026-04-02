import pino from 'pino'

export const logger = pino({
    name: process.env.AYNIG_TRAILER_DWP_STATE,
    level: process.env.AYNIG_LOG_LEVEL,
    transport: {
        target: 'pino-pretty'
    }
});