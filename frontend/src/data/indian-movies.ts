export type IndianMovie = {
  id: string;
  title: string;
  language: string;
  duration: number;
  year?: number;
};

export const INDIAN_MOVIES: IndianMovie[] = [
  { id: '1', title: 'Sample Movie', language: 'Hindi', duration: 120, year: 2024 },
];
