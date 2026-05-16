/**
 * Tait Equation of State
 * 
 * Based on MoldSim tutorials:
 * v(T,p) = v0(T) * (1 - C * ln(1 + p/B(T))) + vt(T,p)
 * 
 * Where:
 * - v0(T) = b1 + b2*(T - b5) for melt, similar for solid
 * - B(T) = b3 * exp(-b4*(T - b5))
 * - vt is transition term
 * - C = 0.0894 (universal constant)
 */

import { getMaterial } from './materials';
import type { DensityRequest, DensityResponse } from './types';

const TAIT_C = 0.0894; // Universal Tait constant

/**
 * Calculate specific volume using Tait equation
 */
export function calculateDensity(request: DensityRequest): DensityResponse {
  const material = getMaterial(request.material);
  
  if (!material) {
    throw new Error(`Unknown material: ${request.material}`);
  }
  
  const T = request.temperature + 273.15; // Convert to Kelvin
  const p = request.pressure || 101325; // Default to atmospheric
  
  // Determine transition temperature at given pressure
  const T_trans = material.b5 + material.b6 * p;
  
  // Determine phase
  const isMelt = T > T_trans;
  const phase = isMelt ? 'melt' : 'solid';
  
  // Select parameters based on phase
  const b1 = isMelt ? material.b1m : material.b1s;
  const b2 = isMelt ? material.b2m : material.b2s;
  const b3 = isMelt ? material.b3m : material.b3s;
  const b4 = isMelt ? material.b4m : material.b4s;
  
  // Calculate reference specific volume
  const v0 = b1 + b2 * (T - material.b5);
  
  // Calculate bulk modulus
  const B = b3 * Math.exp(-b4 * (T - material.b5));
  
  // Tait equation for specific volume
  let specificVolume = v0 * (1 - TAIT_C * Math.log(1 + p / B));
  
  // Add transition term if applicable
  if (!isMelt) {
    const vt = material.b7 * Math.exp(
      material.b8 * (T - material.b5) - material.b9 * p
    );
    specificVolume += vt;
  }
  
  // Convert to density
  const density = 1 / specificVolume;
  
  return {
    density,
    specific_volume: specificVolume,
    material: request.material,
    temperature: request.temperature,
    pressure: p,
    phase,
    model: 'Tait Equation',
  };
}

/**
 * Calculate shrinkage between melt and solid states
 */
export function calculateShrinkage(
  materialName: string,
  meltTemp: number,
  moldTemp: number,
  pressure: number = 101325
): { volumetric_shrinkage: number; linear_shrinkage: number } {
  const meltState = calculateDensity({
    material: materialName,
    temperature: meltTemp,
    pressure,
  });
  
  const solidState = calculateDensity({
    material: materialName,
    temperature: moldTemp,
    pressure,
  });
  
  // Volumetric shrinkage
  const volumetricShrinkage = 
    (meltState.specific_volume - solidState.specific_volume) / 
    meltState.specific_volume * 100;
  
  // Linear shrinkage (approximate as 1/3 of volumetric)
  const linearShrinkage = volumetricShrinkage / 3;
  
  return {
    volumetric_shrinkage: volumetricShrinkage,
    linear_shrinkage: linearShrinkage,
  };
}
