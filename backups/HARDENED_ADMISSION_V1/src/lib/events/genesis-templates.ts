/**
 * 🧬 SOVEREIGN GENESIS TEMPLATE REGISTRY (v1.0)
 * 
 * Blueprints for institutional provisioning.
 * Law 5 & 14 Compliance.
 */

export interface GenesisTemplate {
    id: string;
    version: string;
    description: string;
    classes: { name: string; level: number }[];
    feeMasters: { name: string; type: "CORE" | "ANCILLARY" | "DEPOSIT" | "PENALTY"; isOneTime: boolean }[];
}

export const STANDARD_K10_V1: GenesisTemplate = {
    id: "STANDARD_K10_V1",
    version: "1.0",
    description: "Standard primary and secondary school structure (LKG to 10th).",
    classes: [
        { name: "LKG", level: -2 },
        { name: "UKG", level: -1 },
        { name: "1st Standard", level: 1 },
        { name: "2nd Standard", level: 2 },
        { name: "3rd Standard", level: 3 },
        { name: "4th Standard", level: 4 },
        { name: "5th Standard", level: 5 },
        { name: "6th Standard", level: 6 },
        { name: "7th Standard", level: 7 },
        { name: "8th Standard", level: 8 },
        { name: "9th Standard", level: 9 },
        { name: "10th Standard", level: 10 },
    ],
    feeMasters: [
        { name: "Tuition Fee", type: "CORE", isOneTime: false },
        { name: "Admission Fee", type: "CORE", isOneTime: true },
        { name: "Caution Deposit", type: "DEPOSIT", isOneTime: true },
        { name: "Lab Fee", type: "ANCILLARY", isOneTime: false },
        { name: "Transport Fee", type: "ANCILLARY", isOneTime: false },
        { name: "Exam Fee", type: "ANCILLARY", isOneTime: false },
        { name: "Library Fee", type: "ANCILLARY", isOneTime: false },
        { name: "Computer Fee", type: "ANCILLARY", isOneTime: false },
    ]
};

export const TEMPLATE_REGISTRY: Record<string, GenesisTemplate> = {
    "STANDARD_K10_V1": STANDARD_K10_V1
};
