// unit_conversion on the product = number of strips/sub-units per one base unit (علبة/box).
// For pills, there's usually 10 pills (قرص) per strip (شريط), so we assume * 10 for the pill level.

export const treatmentTypes = [
  // ─── Antibiotics ────────────────────────────────────────────────────────
  { id: "syrup_antibiotic",  name: "مضاد حيوي شرب",    baseUnit: "علبة", hasConversion: false },
  { id: "pill_antibiotic",   name: "مضاد حيوي برشام",  baseUnit: "علبة", units: ["علبة", "شريط", "قرص"], hasConversion: true },

  // ─── Regular medicines ──────────────────────────────────────────────────
  { id: "pill_normal",       name: "دواء عادي برشام",  baseUnit: "علبة", units: ["علبة", "شريط", "قرص"], hasConversion: true },
  { id: "syrup_normal",      name: "دواء شرب عادي",    baseUnit: "علبة", hasConversion: false },

  // ─── Vitamins ───────────────────────────────────────────────────────────
  { id: "pill_vitamin",      name: "فيتامين برشام",    baseUnit: "علبة", units: ["علبة", "شريط", "قرص"], hasConversion: true },
  { id: "syrup_vitamin",     name: "فيتامين شرب",      baseUnit: "علبة", hasConversion: false },

  // ─── Drops ──────────────────────────────────────────────────────────────
  { id: "oral_drops",        name: "نقط فم",           baseUnit: "علبة", hasConversion: false },
  { id: "nasal_drops",       name: "نقط أنف",          baseUnit: "علبة", hasConversion: false },
  { id: "eye_drops",         name: "نقط عين",          baseUnit: "علبة", hasConversion: false },

  // ─── Sprays ─────────────────────────────────────────────────────────────
  { id: "oral_spray",        name: "بخاخ فم",          baseUnit: "علبة", hasConversion: false },
  { id: "nasal_spray",       name: "بخاخ أنف",         baseUnit: "علبة", hasConversion: false },

  // ─── Other forms ────────────────────────────────────────────────────────
  { id: "ointment",          name: "مرهم",             baseUnit: "علبة", hasConversion: false },
  { id: "suppository",       name: "لبوس",             baseUnit: "علبة", units: ["علبة", "شريط", "لبوسة"], hasConversion: true },

  // ─── Injections / Insulin ───────────────────────────────────────────────
  { id: "injection",         name: "حقن",              baseUnit: "علبة", units: ["علبة", "أمبول"], hasConversion: true },
  { id: "insulin",           name: "أنسولين",          baseUnit: "علبة", units: ["علبة", "قلم"],   hasConversion: true },

  // ─── Effervescent / Sachets ─────────────────────────────────────────────
  { id: "effervescent",      name: "فوار",             baseUnit: "علبة", units: ["علبة", "كيس"],   hasConversion: true },

  // ─── Cosmetics ──────────────────────────────────────────────────────────
  { id: "cosmetics",         name: "مستحضرات",        baseUnit: "علبة", hasConversion: false }
];

// Map: treatmentName → [units]
export const typesWithUnits = treatmentTypes.reduce((acc, type) => {
  acc[type.name] = type.hasConversion && type.units
    ? type.units
    : [type.baseUnit];
  return acc;
}, {});

// Helper function to calculate multiplier based on chosen unit.
export const getMultiplier = (prod, selectedUnit, customPills = 10) => {
    const conv = Number(prod.unit_conversion || prod.unitConversion || 1);
    const baseUnit = prod.unit || "علبة";
    
    if (!selectedUnit || selectedUnit === baseUnit) return 1;
    
    if (selectedUnit === "شريط") return conv;
    // user provided custom multiplier for pills per strip
    if (selectedUnit === "قرص" || selectedUnit === "كبسولة" || selectedUnit === "قطعة" || selectedUnit === "لبوسة") {
        return conv * customPills;
    }
    
    // Default config uses conv for anything else (أمبول, قلم, كيس)
    return conv;
};