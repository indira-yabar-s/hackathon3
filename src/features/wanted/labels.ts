import type { CrewRole, FruitFilter, WantedSort, WantedStatus } from '../../types/api';

export const STATUS_LABEL: Record<WantedStatus, string> = {
  AT_LARGE: 'Prófugo',
  CAPTURED: 'Capturado',
  MISSING: 'Desaparecido',
};

export const STATUS_BADGE: Record<WantedStatus, string> = {
  AT_LARGE: 'bg-red-500/15 text-red-300 ring-red-500/40',
  CAPTURED: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40',
  MISSING: 'bg-slate-500/20 text-slate-300 ring-slate-500/40',
};

export const FRUIT_LABEL: Record<FruitFilter, string> = {
  PARAMECIA: 'Paramecia',
  ZOAN: 'Zoan',
  LOGIA: 'Logia',
  NONE: 'Sin fruta',
};

export const SORT_LABEL: Record<WantedSort, string> = {
  'bounty,desc': 'Mayor recompensa',
  'name,asc': 'Nombre (A-Z)',
  'updatedAt,desc': 'Actualizados recientemente',
};

export const ROLE_LABEL: Record<CrewRole, string> = {
  CAPTAIN: 'Capitán',
  FIRST_MATE: 'Primer oficial',
  NAVIGATOR: 'Navegante',
  SNIPER: 'Francotirador',
  COOK: 'Cocinero',
  DOCTOR: 'Médico',
  SHIPWRIGHT: 'Carpintero',
  MUSICIAN: 'Músico',
  ARCHAEOLOGIST: 'Arqueólogo',
  HELMSMAN: 'Timonel',
  FIGHTER: 'Combatiente',
};

const berries = new Intl.NumberFormat('es-PE');
export const formatBerries = (value: number) => `฿ ${berries.format(value)}`;
export const formatNumber = (value: number) => berries.format(value);

const dateFormat = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' });
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
