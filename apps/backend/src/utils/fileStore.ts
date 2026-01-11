import { promises as fs } from "fs";
import path from "path";

const LOGS_DIR = path.resolve(__dirname, "../logs");
const SESSIONS_DIR = path.join(LOGS_DIR, "sessions");

// Ensure directory exists
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// Save report to session log
export async function saveReportToSessionLog(sessionId: string, report: any): Promise<void> {
  try {
    await ensureDir(SESSIONS_DIR);
    const fileName = `${sessionId}-report.json`;
    const filePath = path.join(SESSIONS_DIR, fileName);
    await fs.writeFile(filePath, JSON.stringify(report, null, 2), "utf-8");
    console.log(`Report saved to: ${filePath}`);
  } catch (error) {
    console.error("Failed to save report to session log:", error);
    throw error;
  }
}

// Load report from session log
export async function loadReportFromSessionLog(sessionId: string): Promise<any> {
  try {
    const fileName = `${sessionId}-report.json`;
    const filePath = path.join(SESSIONS_DIR, fileName);
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load report from session log:", error);
    throw error;
  }
}

// List all session reports
export async function listSessionReports(): Promise<string[]> {
  try {
    await ensureDir(SESSIONS_DIR);
    const files = await fs.readdir(SESSIONS_DIR);
    return files
      .filter((f) => f.endsWith("-report.json"))
      .map((f) => f.replace("-report.json", ""));
  } catch (error) {
    console.error("Failed to list session reports:", error);
    return [];
  }
}

// Delete session report
export async function deleteSessionReport(sessionId: string): Promise<void> {
  try {
    const fileName = `${sessionId}-report.json`;
    const filePath = path.join(SESSIONS_DIR, fileName);
    await fs.unlink(filePath);
    console.log(`Report deleted: ${filePath}`);
  } catch (error) {
    console.error("Failed to delete report:", error);
    throw error;
  }
}

// Check if session report exists
export async function sessionReportExists(sessionId: string): Promise<boolean> {
  try {
    const fileName = `${sessionId}-report.json`;
    const filePath = path.join(SESSIONS_DIR, fileName);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
