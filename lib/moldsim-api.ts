/**
 * MoldSim API Client
 * 
 * Client library for interacting with the TypeScript API routes for physics simulation.
 */

import type {
  ViscosityRequest,
  ViscosityResponse,
  DensityRequest,
  DensityResponse,
  CoolingRequest,
  CoolingResponse,
  CostRequest,
  CostResponse,
  ManufacturingCheckRequest,
  ManufacturingCheckResponse,
  FillingRequest,
  FillingResponse,
} from './moldsim/types';

// Re-export types for convenience
export type {
  ViscosityRequest,
  ViscosityResponse,
  DensityRequest,
  DensityResponse,
  CoolingRequest,
  CoolingResponse,
  CostRequest,
  CostResponse,
  ManufacturingCheckRequest,
  ManufacturingCheckResponse,
  FillingRequest,
  FillingResponse,
};

const API_BASE = '/api/moldsim';

async function apiCall<T>(endpoint: string, data?: unknown): Promise<T> {
  const options: RequestInit = data
    ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    : { method: 'GET' };

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }
  
  return response.json();
}

// Material database
export interface MaterialInfo {
  id: string;
  name: string;
  melt_temp_range: string;
  mold_temp_range: string;
  material_cost: number;
}

export async function getMaterials(): Promise<{ materials: MaterialInfo[] }> {
  return apiCall('/materials');
}

// Viscosity calculation
export async function calculateViscosity(
  request: ViscosityRequest
): Promise<ViscosityResponse> {
  return apiCall('/viscosity', request);
}

// Density calculation
export async function calculateDensity(
  request: DensityRequest
): Promise<DensityResponse> {
  return apiCall('/density', request);
}

// Cooling analysis
export async function calculateCooling(
  request: CoolingRequest
): Promise<CoolingResponse> {
  return apiCall('/cooling', request);
}

// Cost estimation
export async function calculateCost(
  request: CostRequest
): Promise<CostResponse> {
  return apiCall('/cost', request);
}

// Manufacturing check (DFM)
export async function checkManufacturing(
  request: ManufacturingCheckRequest
): Promise<ManufacturingCheckResponse> {
  return apiCall('/manufacturing', request);
}

// Filling analysis
export async function calculateFilling(
  request: FillingRequest
): Promise<FillingResponse> {
  return apiCall('/filling', request);
}

// Full analysis combining all checks
export interface FullAnalysisRequest {
  material: string;
  wall_thickness: number;
  part_volume: number;
  part_weight: number;
  projected_area: number;
  part_length: number;
  part_width: number;
  part_height: number;
  melt_temp: number;
  mold_temp: number;
  production_quantity: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
  num_cavities: number;
  num_undercuts: number;
  min_draft_angle: number;
  has_sharp_corners: boolean;
  has_uniform_wall: boolean;
}

export interface FullAnalysisResponse {
  cost: CostResponse;
  cooling: CoolingResponse;
  manufacturing: ManufacturingCheckResponse;
  filling: FillingResponse;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Analysis request timed out after ${ms}ms`)), ms)
    ),
  ])
}

export async function runFullAnalysis(
  params: FullAnalysisRequest
): Promise<FullAnalysisResponse> {
  // Run all analyses in parallel
  const [cost, cooling, manufacturing, filling] = await Promise.all([
    withTimeout(calculateCost({
      material: params.material,
      part_volume: params.part_volume,
      part_weight: params.part_weight,
      projected_area: params.projected_area,
      wall_thickness: params.wall_thickness,
      production_quantity: params.production_quantity,
      complexity: params.complexity,
      num_cavities: params.num_cavities,
      num_undercuts: params.num_undercuts,
      melt_temp: params.melt_temp,
      mold_temp: params.mold_temp,
    }), 10000),
    withTimeout(calculateCooling({
      material: params.material,
      wall_thickness: params.wall_thickness,
      melt_temp: params.melt_temp,
      mold_temp: params.mold_temp,
    }), 10000),
    withTimeout(checkManufacturing({
      wall_thickness: params.wall_thickness,
      min_draft_angle: params.min_draft_angle,
      num_undercuts: params.num_undercuts,
      has_sharp_corners: params.has_sharp_corners,
      has_uniform_wall: params.has_uniform_wall,
      part_length: params.part_length,
      part_width: params.part_width,
      part_height: params.part_height,
      material: params.material,
    }), 10000),
    withTimeout(calculateFilling({
      material: params.material,
      wall_thickness: params.wall_thickness,
      flow_length: Math.max(params.part_length, params.part_width),
      melt_temp: params.melt_temp,
      mold_temp: params.mold_temp,
    }), 10000),
  ]);

  return { cost, cooling, manufacturing, filling };
}

// Legacy API compatibility wrapper
export const moldSimApi = {
  getMaterials,
  calculateViscosity,
  calculateDensity,
  analyzeCooling: calculateCooling,
  estimateCost: calculateCost,
  checkManufacturability: checkManufacturing,
  analyzeFilling: calculateFilling,
};

export default moldSimApi;
