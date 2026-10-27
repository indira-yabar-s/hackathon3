import type { Crew, WantedPage } from '../../types/api';

// Memoria de la sesión (se pierde al recargar). Sirve para que al volver del detalle
// el listado se pinte al instante, sin parpadeo de carga ni request repetida.

const MAX_PAGES = 30;
const pages = new Map<string, WantedPage>();

export const wantedPageCache = {
  get: (key: string): WantedPage | undefined => pages.get(key),
  set: (key: string, page: WantedPage): void => {
    pages.delete(key);
    pages.set(key, page);
    // Map recuerda el orden de inserción: el primero es el más antiguo
    if (pages.size > MAX_PAGES) {
      const oldest = pages.keys().next().value;
      if (oldest !== undefined) pages.delete(oldest);
    }
  },
};

// Posición del scroll por consulta, para restaurarla al volver
export const wantedScrollPositions = new Map<string, number>();

// Las tripulaciones casi no cambian: basta con pedirlas una vez
let crews: Crew[] | null = null;

export const crewsCache = {
  get: (): Crew[] | null => crews,
  set: (value: Crew[]): void => {
    crews = value;
  },
};
