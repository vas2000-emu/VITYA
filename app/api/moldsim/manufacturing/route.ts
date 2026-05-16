import { NextRequest, NextResponse } from 'next/server';
import { checkManufacturability } from '@/lib/moldsim/manufacturing';
import type { ManufacturingCheckRequest } from '@/lib/moldsim/types';

export async function POST(request: NextRequest) {
  try {
    const body: ManufacturingCheckRequest = await request.json();
    
    if (body.wall_thickness === undefined || body.min_draft_angle === undefined ||
        body.num_undercuts === undefined || body.has_sharp_corners === undefined ||
        body.has_uniform_wall === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: wall_thickness, min_draft_angle, num_undercuts, has_sharp_corners, has_uniform_wall' },
        { status: 400 }
      );
    }
    
    const result = checkManufacturability(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
