



import * as winston from "winston";
import fs from "fs";

const getLogFileName = () => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-"); // Avoid special characters
    return `my_app-${timestamp}.log`;
};

const logFileName = getLogFileName();
const logFilePath = logFileName; 
const symlinkPath = "my_app.log";

const base_logger = winston.createLogger({
    level: "info", // Minimum log level
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf((info) => `${info.timestamp} [${info.level}] - ${info.message}`),
    ),
    transports: [
        new winston.transports.File({
            filename: logFileName,
            options: { sync: true } as any,
        }),
    ],
});

try {
    if (fs.existsSync(symlinkPath) || fs.lstatSync(symlinkPath).isSymbolicLink()) {
        fs.unlinkSync(symlinkPath); // Remove existing symlink
    }
    //console.log(`Symlink updated: ${symlinkPath} → ${logFileName}`);
} catch (error) {
    console.error("Error deleting symlink:", error );
}

try {
    fs.symlinkSync(logFilePath, symlinkPath);
    //console.log(`Symlink updated: ${symlinkPath} → ${logFileName}`);
} catch (error) {
    console.error("Error creating symlink:", error );
}


export const logger = base_logger; // legacy, try to find all places this is used and get rid of them

base_logger.warn("log warning");
base_logger.info("log info");

let debug: boolean = false;
if (process.env.LOG == "error") {
    debug = true;
}

export function createLogger(filename: string) {
    if (filename == "") {
        const logger = {
            silly: (...args: any[]) => 1, // do_log(...args),
            debug: (...args: any[]) => 2, // do_log(...args),
            info: (...args: any[]) => 3, 
            warn: (...args: any[]) => 4, 
            error: (...args: any[]) => 5, 
        }
        return logger;
    }
    return {
        ...base_logger,
        silly: (message: string | number | boolean) => {
            base_logger.silly(`${filename} - ${message}`);
        },
        debug: (message: string | number | boolean) => {
            base_logger.debug(`${filename} - ${message}`);
        },
        info: (message: string | number | boolean) => {
            base_logger.info(`${filename} - ${message}`);
        },
        warn: (message: string) => {
            base_logger.warn(`${filename} - ${message}`);
        },
        error: (message: string | number | boolean ) => {
            base_logger.error(`${filename} - ${message}`);
            if (debug) console.error(`${filename} - ${message}`);
        },
    };
}



