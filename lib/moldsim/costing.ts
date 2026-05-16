/**
 * Cost Estimation Model for Injection Molding
 * 
 * Michigan-focused manufacturing costs with factors for:
 * - Local labor rates
 * - Energy costs
 * - Tooling complexity
 * - Material costs
 */

import { getMaterial } from './materials';
import { calculateCooling, calculateProductionRate } from './cooling';
import type { CostRequest, CostResponse } from './types';

// Michigan-specific cost factors
const MI_LABOR_RATE = 35; // $/hour for skilled operator
const MI_MACHINE_RATE_BASE = 50; // $/hour base machine rate
const MI_OVERHEAD_FACTOR = 1.35; // Overhead multiplier
const MI_ENERGY_COST = 0.12; // $/kWh

// Complexity multipliers for tooling
const COMPLEXITY_FACTORS = {
  simple: 1.0,
  moderate: 1.5,
  complex: 2.2,
  very_complex: 3.5,
};

// Base tooling costs
const BASE_MOLD_COST = 15000; // $ for simple single-cavity mold
const CAVITY_COST = 8000; // $ per additional cavity
const UNDERCUT_COST = 3500; // $ per undercut/side action

/**
 * Calculate comprehensive cost estimate
 */
export function calculateCost(request: CostRequest): CostResponse {
  const material = getMaterial(request.material);
  
  if (!material) {
    throw new Error(`Unknown material: ${request.material}`);
  }
  
  const numCavities = request.num_cavities || 1;
  const numUndercuts = request.num_undercuts || 0;
  const complexityFactor = COMPLEXITY_FACTORS[request.complexity];
  
  // Calculate cooling/cycle time
  const cooling = calculateCooling({
    material: request.material,
    wall_thickness: request.wall_thickness,
    melt_temp: request.melt_temp || (material.melt_temp_min + material.melt_temp_max) / 2,
    mold_temp: request.mold_temp || (material.mold_temp_min + material.mold_temp_max) / 2,
  });
  
  const cycleTime = cooling.cycle_time;
  
  // Material cost per part
  const partWeightKg = request.part_weight / 1000;
  const materialCostPerPart = partWeightKg * material.material_cost * 1.05; // 5% waste factor
  
  // Tooling cost
  const baseMoldCost = BASE_MOLD_COST * complexityFactor;
  const cavityCost = (numCavities - 1) * CAVITY_COST * complexityFactor;
  const undercutCost = numUndercuts * UNDERCUT_COST;
  
  // Size factor for mold base
  const projAreaCm2 = request.projected_area;
  const sizeFactor = 1 + Math.max(0, (projAreaCm2 - 100) / 500) * 0.5;
  
  const totalToolingCost = (baseMoldCost + cavityCost + undercutCost) * sizeFactor;
  
  // Amortize tooling over production quantity
  const toolingCostPerPart = totalToolingCost / request.production_quantity;
  
  // Machine rate based on clamping force requirement
  // Rough estimate: 2-4 tons per cm² of projected area
  const clampingForce = projAreaCm2 * 3; // tons
  const machineRate = MI_MACHINE_RATE_BASE * (1 + clampingForce / 500);
  
  // Processing cost per part
  const partsPerHour = (3600 / cycleTime) * numCavities * 0.85; // 85% efficiency
  const processingCostPerPart = machineRate / partsPerHour;
  
  // Labor cost (1 operator per 2 machines average)
  const laborCostPerPart = (MI_LABOR_RATE * 0.5) / partsPerHour;
  
  // Overhead
  const directCosts = materialCostPerPart + processingCostPerPart + laborCostPerPart;
  const overheadCostPerPart = directCosts * (MI_OVERHEAD_FACTOR - 1);
  
  // Total cost per part
  const totalCostPerPart = 
    materialCostPerPart + 
    toolingCostPerPart + 
    processingCostPerPart + 
    laborCostPerPart + 
    overheadCostPerPart;
  
  // Cost breakdown percentages
  const costBreakdown = {
    material_percentage: (materialCostPerPart / totalCostPerPart) * 100,
    tooling_percentage: (toolingCostPerPart / totalCostPerPart) * 100,
    processing_percentage: (processingCostPerPart / totalCostPerPart) * 100,
    labor_percentage: (laborCostPerPart / totalCostPerPart) * 100,
    overhead_percentage: (overheadCostPerPart / totalCostPerPart) * 100,
  };
  
  // Breakeven analysis vs 3D printing (rough estimate: $5/cm³)
  const print3DCostPerPart = request.part_volume * 0.15;
  const marginalCost = totalCostPerPart - toolingCostPerPart;
  const breakevenQuantity = Math.ceil(
    totalToolingCost / (print3DCostPerPart - marginalCost)
  );
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (request.production_quantity < breakevenQuantity && breakevenQuantity > 0) {
    recommendations.push(
      `Consider 3D printing for quantities below ${breakevenQuantity} parts`
    );
  }
  
  if (toolingCostPerPart > totalCostPerPart * 0.4) {
    recommendations.push(
      'Tooling dominates cost - consider higher volume or simpler design'
    );
  }
  
  if (materialCostPerPart > totalCostPerPart * 0.3) {
    recommendations.push(
      'Material is major cost driver - consider wall thickness reduction'
    );
  }
  
  if (numCavities === 1 && request.production_quantity > 50000) {
    recommendations.push(
      'High volume - multi-cavity mold would reduce per-part cost'
    );
  }
  
  if (cycleTime > 45) {
    recommendations.push(
      'Long cycle time - optimize cooling or reduce wall thickness'
    );
  }
  
  if (request.complexity === 'very_complex') {
    recommendations.push(
      'Very complex parts have high tooling risk - consider design simplification'
    );
  }
  
  return {
    total_cost_per_part: Number(totalCostPerPart.toFixed(4)),
    material_cost_per_part: Number(materialCostPerPart.toFixed(4)),
    tooling_cost_per_part: Number(toolingCostPerPart.toFixed(4)),
    processing_cost_per_part: Number(processingCostPerPart.toFixed(4)),
    labor_cost_per_part: Number(laborCostPerPart.toFixed(4)),
    overhead_cost_per_part: Number(overheadCostPerPart.toFixed(4)),
    total_tooling_cost: Number(totalToolingCost.toFixed(2)),
    cycle_time: cycleTime,
    parts_per_hour: Math.floor(partsPerHour),
    machine_hourly_rate: Number(machineRate.toFixed(2)),
    breakeven_quantity: Math.max(0, breakevenQuantity),
    cost_breakdown: {
      material_percentage: Number(costBreakdown.material_percentage.toFixed(1)),
      tooling_percentage: Number(costBreakdown.tooling_percentage.toFixed(1)),
      processing_percentage: Number(costBreakdown.processing_percentage.toFixed(1)),
      labor_percentage: Number(costBreakdown.labor_percentage.toFixed(1)),
      overhead_percentage: Number(costBreakdown.overhead_percentage.toFixed(1)),
    },
    recommendations,
  };
}
