// Material database types
export interface MaterialProperties {
  name: string;
  // Cross-WLF viscosity parameters
  n: number;           // Power law index
  tau_star: number;    // Critical shear stress (Pa)
  D1: number;          // Reference viscosity (Pa.s)
  D2: number;          // Reference temperature (K)
  D3: number;          // Pressure coefficient (K/Pa)
  A1: number;          // WLF constant 1
  A2: number;          // WLF constant 2 (K)
  // Tait equation parameters
  b1m: number;         // Melt specific volume coefficient
  b2m: number;         // Melt temperature coefficient
  b3m: number;         // Melt pressure coefficient
  b4m: number;         // Melt pressure-temperature coefficient
  b1s: number;         // Solid specific volume coefficient
  b2s: number;         // Solid temperature coefficient
  b3s: number;         // Solid pressure coefficient
  b4s: number;         // Solid pressure-temperature coefficient
  b5: number;          // Transition temperature (K)
  b6: number;          // Transition temperature pressure coefficient
  b7: number;          // Specific volume transition coefficient
  b8: number;          // Temperature transition coefficient
  b9: number;          // Pressure transition coefficient
  // Thermal properties
  thermal_conductivity: number;  // W/(m·K)
  specific_heat: number;         // J/(kg·K)
  melt_density: number;          // kg/m³
  // Processing parameters
  melt_temp_min: number;         // °C
  melt_temp_max: number;         // °C
  mold_temp_min: number;         // °C
  mold_temp_max: number;         // °C
  ejection_temp: number;         // °C
  // Cost parameters
  material_cost: number;         // $/kg
}

export interface ViscosityRequest {
  material: string;
  temperature: number;      // °C
  shear_rate: number;       // 1/s
  pressure?: number;        // Pa
}

export interface ViscosityResponse {
  viscosity: number;        // Pa.s
  material: string;
  temperature: number;
  shear_rate: number;
  pressure: number;
  model: string;
}

export interface DensityRequest {
  material: string;
  temperature: number;      // °C
  pressure?: number;        // Pa
}

export interface DensityResponse {
  density: number;          // kg/m³
  specific_volume: number;  // m³/kg
  material: string;
  temperature: number;
  pressure: number;
  phase: string;
  model: string;
}

export interface CoolingRequest {
  material: string;
  wall_thickness: number;   // mm
  melt_temp: number;        // °C
  mold_temp: number;        // °C
  ejection_temp?: number;   // °C
}

export interface CoolingResponse {
  cooling_time: number;           // seconds
  cycle_time: number;             // seconds
  thermal_diffusivity: number;    // m²/s
  fourier_number: number;
  material: string;
  wall_thickness: number;
  melt_temp: number;
  mold_temp: number;
  ejection_temp: number;
  recommendations: string[];
}

export interface CostRequest {
  material: string;
  part_volume: number;              // cm³
  part_weight: number;              // grams
  projected_area: number;           // cm²
  wall_thickness: number;           // mm
  production_quantity: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
  num_cavities?: number;
  num_undercuts?: number;
  melt_temp?: number;               // °C
  mold_temp?: number;               // °C
}

export interface CostResponse {
  total_cost_per_part: number;
  material_cost_per_part: number;
  tooling_cost_per_part: number;
  processing_cost_per_part: number;
  labor_cost_per_part: number;
  overhead_cost_per_part: number;
  total_tooling_cost: number;
  cycle_time: number;
  parts_per_hour: number;
  machine_hourly_rate: number;
  breakeven_quantity: number;
  cost_breakdown: {
    material_percentage: number;
    tooling_percentage: number;
    processing_percentage: number;
    labor_percentage: number;
    overhead_percentage: number;
  };
  recommendations: string[];
}

export interface ManufacturingCheckRequest {
  wall_thickness: number;           // mm
  min_draft_angle: number;          // degrees
  num_undercuts: number;
  has_sharp_corners: boolean;
  has_uniform_wall: boolean;
  part_length?: number;             // mm
  part_width?: number;              // mm
  part_height?: number;             // mm
  material?: string;
}

export interface ManufacturingIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  issue: string;
  recommendation: string;
  estimated_cost_impact?: string;
}

export interface ManufacturingCheckResponse {
  is_manufacturable: boolean;
  overall_score: number;            // 0-100
  issues: ManufacturingIssue[];
  summary: string;
}

export interface FillingRequest {
  material: string;
  wall_thickness: number;           // mm
  flow_length: number;              // mm
  melt_temp: number;                // °C
  mold_temp: number;                // °C
  injection_pressure?: number;      // MPa
}

export interface FillingResponse {
  max_flow_length: number;          // mm
  flow_ratio: number;
  estimated_fill_time: number;      // seconds
  recommended_pressure: number;     // MPa
  average_viscosity: number;        // Pa.s
  is_fillable: boolean;
  recommendations: string[];
}
