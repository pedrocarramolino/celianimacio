/** Datos de marca y sugerencias adaptadas a la actividad de Cel i Animació. */
export const BRAND = {
  name: "Cel i Animació",
  tagline: "Momentos divertidos",
  website: "https://animacionvalencia.es",
  area: "L'Alcúdia (Valencia) y alrededores",
  services: ["Fiestas infantiles", "Bodas", "Comuniones", "Bautizos", "Videomatón 360", "Juegos gigantes", "Visita de Papá Noel", "Halloween", "Fallas", "Fiestas de la espuma", "Campus y escuelas de vacaciones"],
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
  "Videomatón 360",
  "Papá Noel / Reyes",
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
  "Juegos gigantes",
  "Videomatón 360",
  "Visita de Papá Noel",
  "Fiesta de la espuma",
  "Monitores de campus",
  "Desmontaje",
];

/** Ideas de nombre para eventos. */
export const EVENT_NAME_HINT = "Ej.: Boda Inés & Carlos, Comunión de Lucía, Visita de Papá Noel, Halloween, Campus de verano";
