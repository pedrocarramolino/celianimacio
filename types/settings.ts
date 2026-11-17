/** settings/company */
export interface CompanySettings {
  companyName: string;
  timezone: string;
  defaultRadiusMeters: number;
  /** Precisión GPS máxima aceptable (m). Por encima se registra incidencia. */
  maxAccuracyMeters: number;
  /** Minutos de margen antes del inicio en que se permite fichar entrada. */
  checkInEarlyMinutes: number;
  updatedAt: Date | null;
}

export const DEFAULT_SETTINGS: CompanySettings = {
  companyName: "Cel i Animació",
  timezone: "Europe/Madrid",
  defaultRadiusMeters: 200,
  maxAccuracyMeters: 100,
  checkInEarlyMinutes: 60,
  updatedAt: null,
};
