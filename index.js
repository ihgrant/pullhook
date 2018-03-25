require("dotenv").config();
const http = require("http");
const git = require("simple-git/promise");
const winston = require("winston");
const spawn = require("child_process").spawn;

const PORT = process.env.PORT || 8000;
const { AFTER_PULL, WORKING_DIR_PATH } = process.env;

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
            if (AFTER_PULL) {
                return new Promise((resolve, reject) => {
                    const ps = spawn(AFTER_PULL, [], {
                        cwd: WORKING_DIR_PATH,
                        shell: true
                    });
                    ps.stdout.on("data", data => winston.info(`${data}`));
                    ps.stderr.on("data", data => winston.error(`${data}`));
                    ps.on("close", code => (code !== 0 ? reject() : resolve()));
                });
            } else {
                winston.info("no AFTER_PULL command found");
            }
        })
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
