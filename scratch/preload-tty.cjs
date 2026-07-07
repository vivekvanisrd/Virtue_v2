// Preload script to force TTY flags for child CLI execution
process.stdout.isTTY = true;
process.stderr.isTTY = true;
process.stdin.isTTY = true;
