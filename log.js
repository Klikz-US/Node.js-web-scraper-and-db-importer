const fs = require("fs");

module.exports.log = function (thread, message) {
    fs.appendFile("./temp/" + thread + ".log", message + "\n", () => {
        console.log(thread + ": " + message);
    });
};
