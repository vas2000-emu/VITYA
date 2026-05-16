import { NextResponse } from 'next/server';
import { getMaterialNames, MATERIALS } from '@/lib/moldsim/materials';

export async function GET() {
  const materials = getMaterialNames().map(name => ({
    id: name,
    name: MATERIALS[name].name,
    melt_temp_range: `${MATERIALS[name].melt_temp_min}-${MATERIALS[name].melt_temp_max}°C`,
    mold_temp_range: `${MATERIALS[name].mold_temp_min}-${MATERIALS[name].mold_temp_max}°C`,
    material_cost: MATERIALS[name].material_cost,
  }));
  
  return NextResponse.json({ materials });
}
