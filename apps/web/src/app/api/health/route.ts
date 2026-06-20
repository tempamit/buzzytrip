import { createServiceHealth } from '@buzzytrip/contracts';
import { NextResponse } from 'next/server';

export function GET(): NextResponse {
  return NextResponse.json(createServiceHealth('web'));
}
