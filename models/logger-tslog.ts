

/*
import { Logger, FileTransportOptions } from "tslog";

const fileTransportOptions: FileTransportOptions = {
  filename: "my_app.log", // Name of the log file
  sync: false, // Set to true for synchronous writes (might impact performance)
};

const logger = new Logger({
  transport: [
    {
      target: "file", // Use the file transport
      level: "debug", // Minimum level for file transport (optional)
      options: fileTransportOptions,
    },
  ],
});
*/

import { Logger } from "tslog";
import { appendFileSync } from "fs";



const logger = new Logger({
    prettyLogTemplate: "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{filePathWithLine}}{{name}}]\t",
  //  transport: new FileTransport("logs.txt"), // Specify the log file path

});


logger.attachTransport((logObj) => {
  appendFileSync("logs.txt", JSON.stringify(logObj) + "\n");
});


export default logger;