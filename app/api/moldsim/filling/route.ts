import { NextRequest, NextResponse } from 'next/server';
import { calculateFilling } from '@/lib/moldsim/filling';
import type { FillingRequest } from '@/lib/moldsim/types';

export async function POST(request: NextRequest) {
  try {
    const body: FillingRequest = await request.json();
    
    if (!body.material || body.wall_thickness === undefined || 
        body.flow_length === undefined || body.melt_temp === undefined ||
        body.mold_temp === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: material, wall_thickness, flow_length, melt_temp, mold_temp' },
        { status: 400 }
      );
    }
    
    const result = calculateFilling(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
