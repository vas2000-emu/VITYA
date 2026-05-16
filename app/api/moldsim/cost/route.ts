import { NextRequest, NextResponse } from 'next/server';
import { calculateCost } from '@/lib/moldsim/costing';
import type { CostRequest } from '@/lib/moldsim/types';

export async function POST(request: NextRequest) {
  try {
    const body: CostRequest = await request.json();
    
    if (!body.material || body.part_volume === undefined || 
        body.part_weight === undefined || body.projected_area === undefined ||
        body.wall_thickness === undefined || body.production_quantity === undefined ||
        !body.complexity) {
      return NextResponse.json(
        { error: 'Missing required fields: material, part_volume, part_weight, projected_area, wall_thickness, production_quantity, complexity' },
        { status: 400 }
      );
    }
    
    const result = calculateCost(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
