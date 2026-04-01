export function extractUserId(content = "") {
  const match = content.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

export function parseCommand(text = "") {
  if (!text.startsWith("/")) return null;
  const [command, ...args] = text.trim().split(/\s+/);
  return { command: command.toLowerCase(), args };
}

export function parseKeyValueArgs(args = []) {
  return args.reduce((acc, arg) => {
    const [key, value] = arg.split("=");
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});
}