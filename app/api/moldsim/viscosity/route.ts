import { NextRequest, NextResponse } from 'next/server';
import { calculateViscosity } from '@/lib/moldsim/viscosity';
import type { ViscosityRequest } from '@/lib/moldsim/types';

export async function POST(request: NextRequest) {
  try {
    const body: ViscosityRequest = await request.json();
    
    if (!body.material || body.temperature === undefined || body.shear_rate === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: material, temperature, shear_rate' },
        { status: 400 }
      );
    }
    
    const result = calculateViscosity(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
