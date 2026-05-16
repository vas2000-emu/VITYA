import { NextRequest, NextResponse } from 'next/server';
import { calculateDensity } from '@/lib/moldsim/density';
import type { DensityRequest } from '@/lib/moldsim/types';

export async function POST(request: NextRequest) {
  try {
    const body: DensityRequest = await request.json();
    
    if (!body.material || body.temperature === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: material, temperature' },
        { status: 400 }
      );
    }
    
    const result = calculateDensity(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
