# pullhook

This is a simple node server that listens for a request and performs a `git pull` in the directory specified in an environment variable. This is for personal use and I don't intend to support it for anyone else; fork it with wild abandon! It is intended to be run with systemd with `./pullhook.service` as explained here: https://www.axllent.org/docs/view/nodejs-service-with-systemd/. The `pullhook.service` file must be modified with the current working directory (on line 5) before being copied and started.

## runtime environment variables

*   `WORKING_DIR_PATH`: (required )the directory for the repository to be pulled into.
*   `NODE_ENV`: if 'production', logs will be written to disk.
*   `PORT`: The port to listen on, default 8000.
*   `AFTER_PULL`: a shell command to be executed after pulling.
