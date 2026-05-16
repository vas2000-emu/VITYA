/**
 * Cooling and Cycle Time Analysis
 * 
 * Based on heat transfer fundamentals for injection molding:
 * - 1D transient heat conduction
 * - Fourier number analysis
 * - Empirical cycle time estimation
 */

import { getMaterial } from './materials';
import type { CoolingRequest, CoolingResponse } from './types';

/**
 * Calculate cooling time using analytical solution
 * Based on 1D transient heat conduction in a slab
 */
export function calculateCooling(request: CoolingRequest): CoolingResponse {
  const material = getMaterial(request.material);
  
  if (!material) {
    throw new Error(`Unknown material: ${request.material}`);
  }
  
  const thickness = request.wall_thickness / 1000; // Convert mm to m
  const T_melt = request.melt_temp;
  const T_mold = request.mold_temp;
  const T_eject = request.ejection_temp || material.ejection_temp;
  
  // Calculate thermal diffusivity
  const alpha = material.thermal_conductivity / 
    (material.melt_density * material.specific_heat);
  
  // Dimensionless temperature ratio
  const theta = (T_eject - T_mold) / (T_melt - T_mold);
  
  // Use first term of Fourier series solution
  // θ = (8/π²) * exp(-π²*Fo/4) for center temperature
  // Solving for Fo: Fo = -4/(π²) * ln(θ * π²/8)
  
  let Fo: number;
  if (theta <= 0 || theta >= 1) {
    // Edge case: use empirical estimation
    Fo = 1.0;
  } else {
    const logTerm = Math.log(theta * Math.PI * Math.PI / 8);
    Fo = -4 / (Math.PI * Math.PI) * logTerm;
  }
  
  // Ensure positive Fourier number
  Fo = Math.max(0.1, Fo);
  
  // Calculate cooling time: t = Fo * L² / α
  // L is half-thickness for symmetric cooling
  const halfThickness = thickness / 2;
  const coolingTime = Fo * halfThickness * halfThickness / alpha;
  
  // Calculate total cycle time (empirical factors for Michigan manufacturing)
  const fillTime = 2.0; // Typical fill time in seconds
  const packTime = coolingTime * 0.3; // Pack time ~30% of cooling
  const openCloseTime = 3.0; // Mold open/close time
  const ejectionTime = 1.5; // Part ejection time
  
  const cycleTime = fillTime + packTime + coolingTime + openCloseTime + ejectionTime;
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (coolingTime > 30) {
    recommendations.push('Consider reducing wall thickness to decrease cycle time');
  }
  
  if (T_mold > material.mold_temp_max) {
    recommendations.push(`Mold temperature exceeds recommended max of ${material.mold_temp_max}°C`);
  }
  
  if (T_mold < material.mold_temp_min) {
    recommendations.push(`Mold temperature below recommended min of ${material.mold_temp_min}°C`);
  }
  
  if (request.wall_thickness > 4.0) {
    recommendations.push('Thick walls may cause sink marks - consider coring out');
  }
  
  if (request.wall_thickness < 1.0) {
    recommendations.push('Thin walls may cause filling issues - verify flow analysis');
  }
  
  const tempDiff = T_melt - T_mold;
  if (tempDiff > 200) {
    recommendations.push('Large temperature differential may cause warpage');
  }
  
  return {
    cooling_time: Number(coolingTime.toFixed(2)),
    cycle_time: Number(cycleTime.toFixed(2)),
    thermal_diffusivity: alpha,
    fourier_number: Fo,
    material: request.material,
    wall_thickness: request.wall_thickness,
    melt_temp: T_melt,
    mold_temp: T_mold,
    ejection_temp: T_eject,
    recommendations,
  };
}

/**
 * Estimate production rate based on cycle time
 */
export function calculateProductionRate(
  cycleTime: number,
  numCavities: number = 1,
  efficiency: number = 0.85
): { parts_per_hour: number; parts_per_day: number; parts_per_year: number } {
  const cyclesPerHour = 3600 / cycleTime;
  const partsPerHour = cyclesPerHour * numCavities * efficiency;
  
  return {
    parts_per_hour: Math.floor(partsPerHour),
    parts_per_day: Math.floor(partsPerHour * 8), // 8-hour shift
    parts_per_year: Math.floor(partsPerHour * 8 * 250), // 250 working days
  };
}
