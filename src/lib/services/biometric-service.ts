/**
 * SOVEREIGN BIOMETRIC SERVICE (CLIENT-SIDE)
 * ----------------------------------------
 * Handles communication with the local ACPL L1 RD Service.
 * This service MUST run in the browser to access localhost.
 */

export interface RDServiceStatus {
  success: boolean;
  status: string;
  info: string;
  port: number;
}

export interface CaptureResult {
  success: boolean;
  pidBlock?: string;
  error?: string;
}

export class BiometricService {
  private static PORTS = [11100, 11101, 11102]; // Standard RD ports

  /**
   * Discover the RD Service on the local machine
   */
  static async discover(): Promise<RDServiceStatus> {
    for (const port of this.PORTS) {
      try {
        const response = await fetch(`http://localhost:${port}`, {
          method: "RDSERVICE",
        });

        if (response.ok) {
          const xmlText = await response.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");
          const status = xmlDoc.getElementsByTagName("RDService")[0]?.getAttribute("status") || "NOTREADY";
          const info = xmlDoc.getElementsByTagName("RDService")[0]?.getAttribute("info") || "";

          return { success: true, status, info, port };
        }
      } catch (err) {
        continue;
      }
    }

    return { success: false, status: "NOT_FOUND", info: "RD Service not running", port: 0 };
  }

  /**
   * Get Device Info
   * @param port The port where RD service was found
   */
  static async getDeviceInfo(port: number): Promise<any> {
    try {
      const response = await fetch(`http://localhost:${port}/rd/info`, {
        method: "DEVICEINFO",
      });

      if (!response.ok) throw new Error("Device Info Request Failed");

      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      const deviceInfo = xmlDoc.getElementsByTagName("DeviceInfo")[0];
      const additionalInfo = xmlDoc.getElementsByTagName("additional_info")[0];
      
      const info: Record<string, string> = {
        status: deviceInfo?.getAttribute("status") || "UNKNOWN",
        dc: deviceInfo?.getAttribute("dc") || "",
        mi: deviceInfo?.getAttribute("mi") || "",
        mc: deviceInfo?.getAttribute("mc") || "",
      };

      if (additionalInfo) {
        const params = additionalInfo.getElementsByTagName("Param");
        for (let i = 0; i < params.length; i++) {
          const name = params[i].getAttribute("name");
          const value = params[i].getAttribute("value");
          if (name && value) info[name] = value;
        }
      }

      return { success: true, info };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Capture Fingerprint
   * @param port The port where RD service was found
   */
  static async capture(port: number): Promise<CaptureResult> {
    try {
      // Standard PidOptions for L1/L0 Fingerprint Capture
      const pidOpts = `
        <PidOptions ver="1.0">
          <Opts fCount="1" fType="0" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="10000" posh="UNKNOWN" env="P" />
        </PidOptions>
      `.trim();

      const response = await fetch(`http://localhost:${port}/rd/capture`, {
        method: "CAPTURE",
        body: pidOpts,
        headers: {
          "Content-Type": "text/xml",
        },
      });

      if (!response.ok) throw new Error("Capture Request Failed");

      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      const resp = xmlDoc.getElementsByTagName("Resp")[0];
      const errCode = resp?.getAttribute("errCode");
      const errInfo = resp?.getAttribute("errInfo");

      if (errCode !== "0") {
        return { success: false, error: errInfo || "Fingerprint Capture Failed" };
      }

      // The full XML response is the PID block needed for verification
      return { success: true, pidBlock: xmlText };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
