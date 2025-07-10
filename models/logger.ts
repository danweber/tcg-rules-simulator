


Error.stackTraceLimit = Infinity;


import * as winston from "./logger-winston";
import * as tslog from "./logger-tslog";

export const logger = winston.logger;
export const createLogger = winston.createLogger;
//export const logger = tslog.logger;


// import * as Tslog from "./logger-tslog";
