export type Theatre = {
  id: string;
  name: string;
  city: string;
  chain?: string | null;
  screens: number;
};

export const INDIAN_THEATRES: Theatre[] = [
  { id: '1', name: 'PVR Icon Infinity', city: 'Mumbai', chain: 'PVR', screens: 4 },
];

export function getTheatresByCity(city: string): Theatre[] {
  if (!city) return INDIAN_THEATRES;
  return INDIAN_THEATRES.filter((t) => t.city === city);
}

