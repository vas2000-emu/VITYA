/**
 * Design for Manufacturability (DFM) Analysis
 * 
 * Checks part design against injection molding best practices
 */

import { getMaterial } from './materials';
import type { 
  ManufacturingCheckRequest, 
  ManufacturingCheckResponse,
  ManufacturingIssue 
} from './types';

/**
 * Perform DFM analysis on part design
 */
export function checkManufacturability(
  request: ManufacturingCheckRequest
): ManufacturingCheckResponse {
  const issues: ManufacturingIssue[] = [];
  let score = 100;
  
  const material = request.material ? getMaterial(request.material) : null;
  
  // Wall thickness checks
  if (request.wall_thickness < 0.5) {
    issues.push({
      severity: 'critical',
      category: 'Wall Thickness',
      issue: `Wall thickness of ${request.wall_thickness}mm is too thin`,
      recommendation: 'Increase wall thickness to at least 0.8mm for reliable filling',
      estimated_cost_impact: 'High - may cause short shots and require multiple iterations',
    });
    score -= 30;
  } else if (request.wall_thickness < 1.0) {
    issues.push({
      severity: 'warning',
      category: 'Wall Thickness',
      issue: `Wall thickness of ${request.wall_thickness}mm is marginal`,
      recommendation: 'Consider increasing to 1.0-1.5mm for better process stability',
      estimated_cost_impact: 'Medium - may require higher injection pressure',
    });
    score -= 10;
  } else if (request.wall_thickness > 6.0) {
    issues.push({
      severity: 'warning',
      category: 'Wall Thickness',
      issue: `Wall thickness of ${request.wall_thickness}mm is very thick`,
      recommendation: 'Consider coring out to reduce material and cycle time',
      estimated_cost_impact: 'High - significantly longer cycle time',
    });
    score -= 15;
  }
  
  // Draft angle checks
  if (request.min_draft_angle < 0.5) {
    issues.push({
      severity: 'critical',
      category: 'Draft Angle',
      issue: `Draft angle of ${request.min_draft_angle}° is insufficient`,
      recommendation: 'Add minimum 1° draft on all vertical surfaces',
      estimated_cost_impact: 'High - part may stick in mold causing damage',
    });
    score -= 25;
  } else if (request.min_draft_angle < 1.0) {
    issues.push({
      severity: 'warning',
      category: 'Draft Angle',
      issue: `Draft angle of ${request.min_draft_angle}° is marginal`,
      recommendation: 'Increase to 1-2° for reliable ejection, especially with textured surfaces',
      estimated_cost_impact: 'Medium - may cause ejection issues',
    });
    score -= 10;
  }
  
  // Undercut checks
  if (request.num_undercuts > 0) {
    if (request.num_undercuts > 4) {
      issues.push({
        severity: 'critical',
        category: 'Undercuts',
        issue: `${request.num_undercuts} undercuts significantly increase mold complexity`,
        recommendation: 'Redesign to eliminate or reduce undercuts to 2 or fewer',
        estimated_cost_impact: `Very High - adds ~$${(request.num_undercuts * 3500).toLocaleString()} to tooling`,
      });
      score -= 20;
    } else if (request.num_undercuts > 2) {
      issues.push({
        severity: 'warning',
        category: 'Undercuts',
        issue: `${request.num_undercuts} undercuts add mold complexity`,
        recommendation: 'Consider redesign to reduce undercuts if possible',
        estimated_cost_impact: `Medium - adds ~$${(request.num_undercuts * 3500).toLocaleString()} to tooling`,
      });
      score -= 10;
    } else {
      issues.push({
        severity: 'info',
        category: 'Undercuts',
        issue: `${request.num_undercuts} undercut(s) present`,
        recommendation: 'Ensure undercuts are accessible for side actions or lifters',
        estimated_cost_impact: `Moderate - adds ~$${(request.num_undercuts * 3500).toLocaleString()} to tooling`,
      });
      score -= 5;
    }
  }
  
  // Sharp corners check
  if (request.has_sharp_corners) {
    issues.push({
      severity: 'warning',
      category: 'Corner Radii',
      issue: 'Sharp internal corners detected',
      recommendation: 'Add fillet radii of at least 0.5mm to internal corners',
      estimated_cost_impact: 'Medium - stress concentrations may cause cracking',
    });
    score -= 10;
  }
  
  // Wall uniformity check
  if (!request.has_uniform_wall) {
    issues.push({
      severity: 'warning',
      category: 'Wall Uniformity',
      issue: 'Non-uniform wall thickness detected',
      recommendation: 'Maintain wall thickness within ±25% to prevent sink marks and warpage',
      estimated_cost_impact: 'Medium - may cause cosmetic defects',
    });
    score -= 15;
  }
  
  // Aspect ratio check (if dimensions provided)
  if (request.part_length && request.part_width) {
    const aspectRatio = Math.max(request.part_length, request.part_width) / 
                        Math.min(request.part_length, request.part_width);
    if (aspectRatio > 4) {
      issues.push({
        severity: 'warning',
        category: 'Aspect Ratio',
        issue: `High aspect ratio of ${aspectRatio.toFixed(1)}:1 may cause warpage`,
        recommendation: 'Add ribs or gussets to improve dimensional stability',
        estimated_cost_impact: 'Medium - may require post-mold fixtures',
      });
      score -= 10;
    }
  }
  
  // Material-specific checks
  if (material) {
    // Temperature range info
    issues.push({
      severity: 'info',
      category: 'Material',
      issue: `${material.name} selected`,
      recommendation: `Process at ${material.melt_temp_min}-${material.melt_temp_max}°C melt, ${material.mold_temp_min}-${material.mold_temp_max}°C mold`,
    });
  }
  
  // Ensure score is in valid range
  score = Math.max(0, Math.min(100, score));
  
  // Determine if manufacturable
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const isManufacturable = criticalIssues.length === 0 && score >= 50;
  
  // Generate summary
  let summary: string;
  if (score >= 90) {
    summary = 'Excellent design for injection molding. Ready for tooling.';
  } else if (score >= 75) {
    summary = 'Good design with minor improvements recommended.';
  } else if (score >= 50) {
    summary = 'Acceptable design but significant improvements would reduce cost and risk.';
  } else {
    summary = 'Design requires modifications before proceeding with tooling.';
  }
  
  return {
    is_manufacturable: isManufacturable,
    overall_score: score,
    issues,
    summary,
  };
}
