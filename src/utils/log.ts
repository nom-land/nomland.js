// let bunyan;
// if (typeof window === "undefined") {
//     bunyan = require("bunyan");
// } else {
//     bunyan = require("browser-bunyan");
// }

// export const log = bunyan.createLogger({
//     name: "nunti",
// });

class Logger {
    info(...args: any[]) {
        console.log(...args);
    }
    warn(...args: any[]) {
        console.warn(...args);
    }
    error(...args: any[]) {
        console.error(...args);
    }
}

export const log = new Logger();
