import { NextRequest, NextResponse } from 'next/server';
import { calculateCooling } from '@/lib/moldsim/cooling';
import type { CoolingRequest } from '@/lib/moldsim/types';

export async function POST(request: NextRequest) {
  try {
    const body: CoolingRequest = await request.json();
    
    if (!body.material || body.wall_thickness === undefined || 
        body.melt_temp === undefined || body.mold_temp === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: material, wall_thickness, melt_temp, mold_temp' },
        { status: 400 }
      );
    }
    
    const result = calculateCooling(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
