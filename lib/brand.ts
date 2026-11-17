/** Datos de marca y sugerencias adaptadas a la actividad de Cel i Animació. */
export const BRAND = {
  name: "Cel i Animació",
  tagline: "Animación infantil y eventos",
  area: "L'Alcúdia (Valencia) y alrededores",
  services: ["Fiestas infantiles", "Bodas", "Comuniones", "Bautizos", "Candy bar", "Campus y escuelas de vacaciones", "Fiestas de la espuma", "Fallas"],
  /** Centro por defecto del mapa: L'Alcúdia */
  mapCenter: [39.1953, -0.5072] as [number, number],
} as const;

/** Puestos habituales (sugerencias, se puede escribir cualquier otro). */
export const POSITION_SUGGESTIONS = [
  "Animador/a",
  "Monitor/a de tiempo libre",
  "Coordinador/a",
  "Pintacaras",
  "Globoflexia",
  "Personaje / mascota",
  "Magia",
  "DJ / sonido",
  "Candy bar",
  "Montaje / logística",
  "Hinchables y espuma",
];

/** Turnos habituales. */
export const SHIFT_NAME_SUGGESTIONS = [
  "Montaje",
  "Animación infantil",
  "Juegos y dinámicas",
  "Pintacaras y globoflexia",
  "Candy bar",
  "Fiesta de la espuma",
  "Monitores de campus",
  "Desmontaje",
];

/** Ideas de nombre para eventos. */
export const EVENT_NAME_HINT = "Ej.: Comunión de Lucía, Boda Marta y Pau, Campus de verano, Fiesta de la espuma";
