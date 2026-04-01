import os from "node:os";

function escapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildPercentBar(percent) {
  const normalized = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const total = 10;
  const filled = Math.round((normalized / 100) * total);
  return `[${"#".repeat(filled)}${"-".repeat(total - filled)}]`;
}

export function buildPingMessage(locale, startedAt) {
  const latency = Date.now() - startedAt;
  const isVi = locale?.code !== "en";
  const title = isVi ? "Kiểm tra kết nối" : "Connection check";
  const quality =
    latency < 350 ? (isVi ? "Tốt" : "Good") : latency < 900 ? (isVi ? "Trung bình" : "Medium") : isVi ? "Chậm" : "Slow";

  return [
    `<b>${title}</b>`,
    `<b>Ping:</b> ${latency}ms`,
    `<b>${isVi ? "Đánh giá" : "Quality"}:</b> ${quality}`
  ].join("\n");
}

export function buildCpuMessage(locale) {
  const load = os.loadavg()[0] ?? 0;
  const totalGb = os.totalmem() / 1024 ** 3;
  const freeGb = os.freemem() / 1024 ** 3;
  const usedGb = totalGb - freeGb;
  const usagePercent = totalGb ? ((usedGb / totalGb) * 100).toFixed(2) : "0.00";
  const isVi = locale?.code !== "en";
  const title = isVi ? "Thông tin máy chủ" : "Server status";
  const cpuModel = os.cpus()?.[0]?.model ?? "Unknown";
  const ramBar = buildPercentBar(Number(usagePercent));

  return [
    `<b>${title}</b>`,
    `<b>CPU:</b> ${escapeHtml(cpuModel)}`,
    `<b>${isVi ? "Tải (1 phút)" : "Load (1m)"}:</b> ${load.toFixed(2)}`,
    `<b>RAM:</b> ${usedGb.toFixed(2)}/${totalGb.toFixed(2)} GB`,
    `<b>${isVi ? "Mức sử dụng" : "Usage"}:</b> ${ramBar} ${usagePercent}%`
  ].join("\n");
}

export function buildRestartMessage(locale) {
  const isVi = locale?.code !== "en";
  const title = isVi ? "Khởi động lại bot" : "Restart bot";
  return [`<b>${title}</b>`, escapeHtml(locale.texts.restartInfo)].join("\n");
}
