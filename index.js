require("dotenv").config();
const http = require("http");
const git = require("simple-git/promise");
const winston = require("winston");

const PORT = process.env.PORT || 8000;
const WORKING_DIR_PATH = process.env.WORKING_DIR_PATH;

if (!WORKING_DIR_PATH) {
    console.error(
        "environment variable WORKING_DIR_PATH is required but was not defined."
    );
    process.exit(1);
}

if (process.env.NODE_ENV === "production") {
    winston.add(winston.transports.File, { filename: "pullhook.log" });
}

const srv = http.createServer((req, res) => {
    const repo = git(WORKING_DIR_PATH);

    repo
        .outputHandler((command, stdout, stderr) => {
            winston.info(command);
            stdout.pipe(process.stdout);
            stderr.pipe(process.stderr);
        })
        .checkout("master")
        .then(() => repo.clean("f"))
        .then(() => repo.checkout(["--", "."]))
        .then(() => repo.pull(["origin','master"]))
        .then(() => {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("okay");
        })
        .catch(err => {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end(err.message);
        });
});

srv.listen(PORT, () => {
    console.log(`> server listening on port ${PORT}`);
});
