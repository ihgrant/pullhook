require("dotenv").config();
const http = require("http");
const git = require("simple-git/promise");
const winston = require("winston");
const exec = require("child_process").exec;

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

function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, { cwd: WORKING_DIR_PATH }, (error, stdout, stderr) => {
            if (error) {
                winston.error(error);
                reject(error);
            } else {
                winston.info(stdout);
                resolve();
            }
        });
    });
}

function pull(res) {
    const repo = git(WORKING_DIR_PATH);

    return repo
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
                return executeCommand(AFTER_PULL);
            } else {
                winston.info("no AFTER_PULL command found");
            }
        })
}

const srv = http.createServer((req, res) => {
    switch (req.method) {
        case 'GET':
            res.writeHead(200)
            res.end()
            break;
        case 'POST':
            pull()
                .then(() => {
                    winston.info(">> finished");
                    res.writeHead(200, { "Content-Type": "text/plain" });
                    res.end("okay");
                })
                .catch(err => {
                    res.writeHead(500, { "Content-Type": "text/plain" });
                    res.end(err.message);
                });
            break;
        default:
            winston.error(`method ${req.method} was not matched.`)
            res.writeHead(400)
            res.end()
            break;
    }
});

srv.listen(PORT, () => {
    console.log(`> server listening on port ${PORT}`);
});
