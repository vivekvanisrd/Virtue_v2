import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * 📦 INSTITUTIONAL BACKUP SERVICE
 * Handles daily zipping of the /data registry.
 */
export class BackupService {
  private static readonly DATA_DIR = path.join(process.cwd(), 'data');
  private static readonly BACKUP_DIR = path.join(process.cwd(), 'backups');

  /**
   * 🏛️ CREATE DAILY SNAPSHOT
   * Orchestrates a full zip of the institutional filesystem.
   */
  static async createSnapshot(): Promise<string> {
    if (!fs.existsSync(this.BACKUP_DIR)) {
      fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `virtue-backup-${timestamp}.zip`;
    const outputPath = path.join(this.BACKUP_DIR, fileName);

    console.log(`🚀 Starting system backup: ${fileName}...`);

    return new Promise((resolve, reject) => {
      // Use native Windows 'tar' to zip the data folder
      // Command: tar -a -c -f backup.zip data
      const tar = spawn('tar', ['-a', '-c', '-f', outputPath, 'data'], {
        cwd: process.cwd(),
      });

      tar.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Backup Successful: ${outputPath}`);
          resolve(outputPath);
        } else {
          reject(new Error(`BACKUP_FAULT: Tar process exited with code ${code}`));
        }
      });

      tar.on('error', (err) => {
        reject(err);
      });
    });
  }
}
