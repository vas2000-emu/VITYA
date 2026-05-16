import type { MaterialProperties } from './types';

// Material database with Cross-WLF viscosity and Tait equation parameters
// Values derived from literature and MoldSim tutorials
export const MATERIALS: Record<string, MaterialProperties> = {
  'ABS': {
    name: 'ABS (Acrylonitrile Butadiene Styrene)',
    // Cross-WLF parameters
    n: 0.25,
    tau_star: 51000,
    D1: 2.6e12,
    D2: 373.15,
    D3: 0,
    A1: 28.5,
    A2: 51.6,
    // Tait parameters
    b1m: 0.000974, b2m: 6.63e-7, b3m: 1.51e8, b4m: 0.0044,
    b1s: 0.000883, b2s: 2.32e-7, b3s: 2.57e8, b4s: 0.0027,
    b5: 373.15, b6: 4.0e-8, b7: 0.000085, b8: 0.0, b9: 0.0,
    // Thermal properties
    thermal_conductivity: 0.17,
    specific_heat: 1470,
    melt_density: 1020,
    // Processing
    melt_temp_min: 220, melt_temp_max: 260,
    mold_temp_min: 40, mold_temp_max: 80,
    ejection_temp: 90,
    // Cost
    material_cost: 2.5,
  },
  'PP': {
    name: 'PP (Polypropylene)',
    n: 0.35,
    tau_star: 30000,
    D1: 1.0e11,
    D2: 263.15,
    D3: 0,
    A1: 20.0,
    A2: 51.6,
    b1m: 0.001230, b2m: 9.30e-7, b3m: 9.13e7, b4m: 0.0049,
    b1s: 0.001080, b2s: 3.60e-7, b3s: 2.10e8, b4s: 0.0029,
    b5: 443.15, b6: 3.4e-8, b7: 0.000107, b8: 0.0, b9: 0.0,
    thermal_conductivity: 0.15,
    specific_heat: 1920,
    melt_density: 850,
    melt_temp_min: 200, melt_temp_max: 280,
    mold_temp_min: 20, mold_temp_max: 60,
    ejection_temp: 80,
    material_cost: 1.5,
  },
  'PE-HD': {
    name: 'PE-HD (High Density Polyethylene)',
    n: 0.45,
    tau_star: 25000,
    D1: 5.0e10,
    D2: 233.15,
    D3: 0,
    A1: 18.0,
    A2: 51.6,
    b1m: 0.001240, b2m: 9.80e-7, b3m: 8.50e7, b4m: 0.0052,
    b1s: 0.001050, b2s: 4.10e-7, b3s: 2.40e8, b4s: 0.0030,
    b5: 403.15, b6: 3.2e-8, b7: 0.000098, b8: 0.0, b9: 0.0,
    thermal_conductivity: 0.44,
    specific_heat: 2300,
    melt_density: 920,
    melt_temp_min: 180, melt_temp_max: 260,
    mold_temp_min: 20, mold_temp_max: 60,
    ejection_temp: 70,
    material_cost: 1.4,
  },
  'PA6': {
    name: 'PA6 (Nylon 6)',
    n: 0.28,
    tau_star: 45000,
    D1: 3.2e12,
    D2: 323.15,
    D3: 0,
    A1: 30.0,
    A2: 51.6,
    b1m: 0.000950, b2m: 6.20e-7, b3m: 1.80e8, b4m: 0.0041,
    b1s: 0.000860, b2s: 2.50e-7, b3s: 3.00e8, b4s: 0.0025,
    b5: 493.15, b6: 4.5e-8, b7: 0.000078, b8: 0.0, b9: 0.0,
    thermal_conductivity: 0.25,
    specific_heat: 1700,
    melt_density: 1080,
    melt_temp_min: 250, melt_temp_max: 290,
    mold_temp_min: 60, mold_temp_max: 90,
    ejection_temp: 100,
    material_cost: 3.5,
  },
  'PC': {
    name: 'PC (Polycarbonate)',
    n: 0.22,
    tau_star: 58000,
    D1: 4.0e12,
    D2: 418.15,
    D3: 0,
    A1: 32.0,
    A2: 51.6,
    b1m: 0.000870, b2m: 5.80e-7, b3m: 2.10e8, b4m: 0.0038,
    b1s: 0.000790, b2s: 2.10e-7, b3s: 3.20e8, b4s: 0.0022,
    b5: 423.15, b6: 5.0e-8, b7: 0.000072, b8: 0.0, b9: 0.0,
    thermal_conductivity: 0.20,
    specific_heat: 1200,
    melt_density: 1150,
    melt_temp_min: 280, melt_temp_max: 320,
    mold_temp_min: 80, mold_temp_max: 120,
    ejection_temp: 120,
    material_cost: 4.0,
  },
};

export function getMaterial(name: string): MaterialProperties | null {
  return MATERIALS[name] || null;
}

export function getMaterialNames(): string[] {
  return Object.keys(MATERIALS);
}
