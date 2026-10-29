import type { CategoryId } from '../types';

export interface Category {
  id: CategoryId;
  /** Norwegian name, as in the textbooks */
  no: string;
  ru: string;
  uk: string;
  /** How many questions of this topic go into one 45-question exam */
  inExam: number;
}

export const CATEGORIES: Category[] = [
  { id: 'vikeplikt', no: 'Vikeplikt', ru: 'Кто кому уступает дорогу', uk: 'Хто кому поступається дорогою', inExam: 7 },
  { id: 'skilt', no: 'Trafikkskilt', ru: 'Дорожные знаки', uk: 'Дорожні знаки', inExam: 6 },
  { id: 'lyssignal', no: 'Lyssignal og politi', ru: 'Светофоры и регулировщик', uk: 'Світлофори та регулювальник', inExam: 2 },
  { id: 'oppmerking', no: 'Veioppmerking', ru: 'Дорожная разметка', uk: 'Дорожня розмітка', inExam: 2 },
  { id: 'fart', no: 'Fart og avstand', ru: 'Скорость и дистанция', uk: 'Швидкість і дистанція', inExam: 3 },
  { id: 'plassering', no: 'Plassering og kjørefelt', ru: 'Полосы, перестроение, круговое движение', uk: 'Смуги, перестроювання, круговий рух', inExam: 3 },
  { id: 'forbikjoring', no: 'Forbikjøring og møting', ru: 'Обгон и встречный разъезд', uk: 'Обгін і зустрічний роз’їзд', inExam: 2 },
  { id: 'parkering', no: 'Stans og parkering', ru: 'Остановка и стоянка', uk: 'Зупинка і стоянка', inExam: 2 },
  { id: 'mennesket', no: 'Føreren', ru: 'Водитель: внимание, алкоголь, усталость', uk: 'Водій: увага, алкоголь, втома', inExam: 4 },
  { id: 'myke', no: 'Myke trafikanter', ru: 'Пешеходы, велосипедисты, дети, животные', uk: 'Пішоходи, велосипедисти, діти, тварини', inExam: 3 },
  { id: 'sikring', no: 'Sikring og last', ru: 'Ремни, дети, груз, прицеп', uk: 'Ремені, діти, вантаж, причіп', inExam: 2 },
  { id: 'lys', no: 'Lys og sikt', ru: 'Фары и видимость', uk: 'Фари і видимість', inExam: 2 },
  { id: 'kjoretoy', no: 'Kjøretøyet', ru: 'Автомобиль и его проверка', uk: 'Автомобіль і його перевірка', inExam: 2 },
  { id: 'vinter', no: 'Vinter, føre og tunnel', ru: 'Зима, покрытие, туннели', uk: 'Зима, покриття, тунелі', inExam: 2 },
  { id: 'ulykke', no: 'Ulykke og førstehjelp', ru: 'ДТП и первая помощь', uk: 'ДТП і перша допомога', inExam: 1 },
  { id: 'miljo', no: 'Miljø', ru: 'Экономичная и экологичная езда', uk: 'Економна та екологічна їзда', inExam: 1 },
  { id: 'forerkort', no: 'Førerkort og regler', ru: 'Права, штрафные баллы, обучение', uk: 'Права, штрафні бали, навчання', inExam: 1 },
];

export const CATEGORY = Object.fromEntries(CATEGORIES.map(c => [c.id, c])) as Record<CategoryId, Category>;
