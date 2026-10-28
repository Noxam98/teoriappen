import type { CategoryId } from '../types';

export interface Category {
  id: CategoryId;
  /** Norwegian name, as in the textbooks */
  no: string;
  ru: string;
  /** How many questions of this topic go into one 45-question exam */
  inExam: number;
}

export const CATEGORIES: Category[] = [
  { id: 'vikeplikt', no: 'Vikeplikt', ru: 'Кто кому уступает дорогу', inExam: 7 },
  { id: 'skilt', no: 'Trafikkskilt', ru: 'Дорожные знаки', inExam: 6 },
  { id: 'lyssignal', no: 'Lyssignal og politi', ru: 'Светофоры и регулировщик', inExam: 2 },
  { id: 'oppmerking', no: 'Veioppmerking', ru: 'Дорожная разметка', inExam: 2 },
  { id: 'fart', no: 'Fart og avstand', ru: 'Скорость и дистанция', inExam: 3 },
  { id: 'plassering', no: 'Plassering og kjørefelt', ru: 'Полосы, перестроение, круговое движение', inExam: 3 },
  { id: 'forbikjoring', no: 'Forbikjøring og møting', ru: 'Обгон и встречный разъезд', inExam: 2 },
  { id: 'parkering', no: 'Stans og parkering', ru: 'Остановка и стоянка', inExam: 2 },
  { id: 'mennesket', no: 'Føreren', ru: 'Водитель: внимание, алкоголь, усталость', inExam: 4 },
  { id: 'myke', no: 'Myke trafikanter', ru: 'Пешеходы, велосипедисты, дети, животные', inExam: 3 },
  { id: 'sikring', no: 'Sikring og last', ru: 'Ремни, дети, груз, прицеп', inExam: 2 },
  { id: 'lys', no: 'Lys og sikt', ru: 'Фары и видимость', inExam: 2 },
  { id: 'kjoretoy', no: 'Kjøretøyet', ru: 'Автомобиль и его проверка', inExam: 2 },
  { id: 'vinter', no: 'Vinter, føre og tunnel', ru: 'Зима, покрытие, туннели', inExam: 2 },
  { id: 'ulykke', no: 'Ulykke og førstehjelp', ru: 'ДТП и первая помощь', inExam: 1 },
  { id: 'miljo', no: 'Miljø', ru: 'Экономичная и экологичная езда', inExam: 1 },
  { id: 'forerkort', no: 'Førerkort og regler', ru: 'Права, штрафные баллы, обучение', inExam: 1 },
];

export const CATEGORY = Object.fromEntries(CATEGORIES.map(c => [c.id, c])) as Record<CategoryId, Category>;
