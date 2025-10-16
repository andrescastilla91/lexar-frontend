export interface Advisor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  status: 'Disponible' | 'En audiencia' | 'En reunión';
  rating: number;
  experienceYears: number;
}
