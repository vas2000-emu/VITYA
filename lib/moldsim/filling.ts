/**
 * Flow/Filling Analysis
 * 
 * Simplified flow length and pressure estimation
 * for injection molding design validation
 */

import { getMaterial } from './materials';
import { calculateViscosity } from './viscosity';
import type { FillingRequest, FillingResponse } from './types';

// Typical injection parameters
const TYPICAL_SHEAR_RATE = 1000; // 1/s
const SAFETY_FACTOR = 0.8; // Design margin

/**
 * Calculate flow analysis for part filling
 */
export function calculateFilling(request: FillingRequest): FillingResponse {
  const material = getMaterial(request.material);
  
  if (!material) {
    throw new Error(`Unknown material: ${request.material}`);
  }
  
  const thickness = request.wall_thickness / 1000; // Convert to meters
  const flowLength = request.flow_length / 1000; // Convert to meters
  
  // Calculate average viscosity at typical conditions
  const viscosityResult = calculateViscosity({
    material: request.material,
    temperature: request.melt_temp,
    shear_rate: TYPICAL_SHEAR_RATE,
    pressure: (request.injection_pressure || 100) * 1e6,
  });
  
  const viscosity = viscosityResult.viscosity;
  
  // Simplified flow length calculation
  // Based on empirical correlation: L/t = K * (ΔP / η)^0.5
  // Where K depends on material flow characteristics
  
  // Flow coefficient (empirical, material-dependent)
  const K = 0.012 * (1 / material.n); // Adjusted for power law index
  
  // Maximum available pressure (default 100 MPa if not specified)
  const maxPressure = (request.injection_pressure || 100) * 1e6; // Convert to Pa
  
  // Calculate maximum flow length
  const maxFlowLength = K * thickness * Math.sqrt(maxPressure / viscosity);
  
  // Flow ratio
  const flowRatio = flowLength / maxFlowLength;
  
  // Estimated fill time (simplified)
  // Based on volumetric flow rate estimation
  const partVolume = flowLength * thickness * thickness * 10; // Rough approximation
  const fillTime = partVolume * viscosity / (maxPressure * thickness * thickness) * 1000;
  
  // Recommended pressure (with safety factor)
  const requiredPressure = maxPressure * flowRatio * flowRatio / SAFETY_FACTOR;
  const recommendedPressure = Math.min(200e6, requiredPressure); // Cap at 200 MPa
  
  // Check if fillable
  const isFillable = flowRatio < SAFETY_FACTOR;
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (!isFillable) {
    recommendations.push(
      'Flow length exceeds capability - consider adding gates or increasing wall thickness'
    );
  }
  
  if (flowRatio > 0.7) {
    recommendations.push(
      'Flow length is near limit - ensure adequate venting at flow front'
    );
  }
  
  if (request.wall_thickness < 1.5 && request.flow_length > 100) {
    recommendations.push(
      'Thin wall with long flow - consider hot runner system'
    );
  }
  
  if (requiredPressure > 150e6) {
    recommendations.push(
      'High pressure required - verify machine tonnage is adequate'
    );
  }
  
  const tempRange = material.melt_temp_max - material.melt_temp_min;
  const tempPosition = (request.melt_temp - material.melt_temp_min) / tempRange;
  
  if (tempPosition < 0.3) {
    recommendations.push(
      'Consider higher melt temperature to improve flow'
    );
  }
  
  if (viscosity > 1000) {
    recommendations.push(
      'High viscosity - ensure adequate injection speed capability'
    );
  }
  
  return {
    max_flow_length: Number((maxFlowLength * 1000).toFixed(1)), // Convert back to mm
    flow_ratio: Number(flowRatio.toFixed(3)),
    estimated_fill_time: Number(Math.max(0.5, fillTime).toFixed(2)),
    recommended_pressure: Number((recommendedPressure / 1e6).toFixed(1)), // MPa
    average_viscosity: Number(viscosity.toFixed(1)),
    is_fillable: isFillable,
    recommendations,
  };
}
