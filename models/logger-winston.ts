



import * as winston from "winston";

const base_logger = winston.createLogger({
    level: "info", // Minimum log level
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf((info) => `${info.timestamp} [${info.level}] - ${info.message}`),
    ),
    transports: [
        new winston.transports.File({
            filename: "my_app.log",
            options: { sync: true } as any,
        }),
        
        //new winston.transports.Console({
        //    format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        //}),
        
    ],
});

export const logger = base_logger; // legacy, try to find all places this is used and get rid of them

base_logger.warn("test message 1");
base_logger.warn("test message 2");
base_logger.warn("test message 3");
base_logger.info("test message");

export function createLogger(filename: string) {
    return {
        ...base_logger,
        silly: (message: string | number | boolean) => {
            base_logger.silly(`${filename} - ${message}`);
        },
        debug: (message: string | number) => {
            base_logger.debug(`${filename} - ${message}`);
        },
        info: (message: string) => {
            base_logger.info(`${filename} - ${message}`);
        },
        warn: (message: string) => {
            base_logger.warn(`${filename} - ${message}`);
        },
        error: (message: string) => {
            base_logger.error(`${filename} - ${message}`);
            console.error(`${filename} - ${message}`);
        },
    };
}



