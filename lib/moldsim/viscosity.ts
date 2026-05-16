/**
 * Cross-WLF Viscosity Model
 * 
 * Based on the Cross-WLF equation from MoldSim tutorials:
 * η = η₀ / (1 + (η₀γ̇/τ*)^(1-n))
 * 
 * Where η₀ is the zero-shear viscosity from the WLF equation:
 * η₀ = D1 * exp(-A1*(T-D2) / (A2+(T-D2)))
 */

import { getMaterial } from './materials';
import type { ViscosityRequest, ViscosityResponse } from './types';

/**
 * Calculate zero-shear viscosity using WLF equation
 * @param D1 Reference viscosity (Pa.s)
 * @param A1 WLF constant 1
 * @param A2 WLF constant 2 (K)
 * @param T Temperature (K)
 * @param D2 Reference temperature (K)
 * @param D3 Pressure coefficient (K/Pa)
 * @param p Pressure (Pa)
 */
function wlfViscosity(
  D1: number,
  A1: number,
  A2: number,
  T: number,
  D2: number,
  D3: number,
  p: number
): number {
  // Temperature shift due to pressure
  const T_star = D2 + D3 * p;
  
  // WLF equation
  const exponent = -A1 * (T - T_star) / (A2 + (T - T_star));
  
  // Clamp exponent to avoid overflow
  const clampedExponent = Math.max(-50, Math.min(50, exponent));
  
  return D1 * Math.exp(clampedExponent);
}

/**
 * Calculate viscosity using Cross model
 * @param eta0 Zero-shear viscosity (Pa.s)
 * @param gamma_dot Shear rate (1/s)
 * @param tau_star Critical shear stress (Pa)
 * @param n Power law index
 */
function crossViscosity(
  eta0: number,
  gamma_dot: number,
  tau_star: number,
  n: number
): number {
  if (gamma_dot <= 0) {
    return eta0;
  }
  
  const term = (eta0 * gamma_dot) / tau_star;
  return eta0 / (1 + Math.pow(term, 1 - n));
}

/**
 * Calculate Cross-WLF viscosity for a given material and conditions
 */
export function calculateViscosity(request: ViscosityRequest): ViscosityResponse {
  const material = getMaterial(request.material);
  
  if (!material) {
    throw new Error(`Unknown material: ${request.material}`);
  }
  
  const T = request.temperature + 273.15; // Convert to Kelvin
  const p = request.pressure || 0;
  
  // Calculate zero-shear viscosity
  const eta0 = wlfViscosity(
    material.D1,
    material.A1,
    material.A2,
    T,
    material.D2,
    material.D3,
    p
  );
  
  // Calculate shear-thinning viscosity
  const viscosity = crossViscosity(
    eta0,
    request.shear_rate,
    material.tau_star,
    material.n
  );
  
  return {
    viscosity,
    material: request.material,
    temperature: request.temperature,
    shear_rate: request.shear_rate,
    pressure: p,
    model: 'Cross-WLF',
  };
}

/**
 * Calculate viscosity over a range of shear rates
 */
export function calculateViscosityCurve(
  materialName: string,
  temperature: number,
  shearRates: number[],
  pressure: number = 0
): Array<{ shear_rate: number; viscosity: number }> {
  return shearRates.map(shear_rate => {
    const result = calculateViscosity({
      material: materialName,
      temperature,
      shear_rate,
      pressure,
    });
    return { shear_rate, viscosity: result.viscosity };
  });
}
