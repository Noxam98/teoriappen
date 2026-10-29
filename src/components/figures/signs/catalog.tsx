// Every road sign the questions can show, keyed as in the question JSON files ({"sign": "vikeplikt"}).
import type { ReactElement } from 'react';
import {
  ArrowDown, ArrowUp, Bicycle, BlueDisc, BluePlate, CarRear, CarSide, COLOR, EndDisc, Locomotive, Moose, Person,
  Place, Ring, RoundArrows, Runner, SIGN_FONT, SignNumber, Stripes, Strike, Triangle,
} from './parts';

const { red, blue, yellow, ink, grey } = COLOR;

function octagon(r: number): string {
  return Array.from({ length: 8 }, (_, i) => {
    const a = ((22.5 + i * 45) * Math.PI) / 180;
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

const Motorway = () => (
  <>
    <rect x={12} y={28} width={76} height={9} fill="#fff" />
    <path d="M22 92 L43 44 H47 L39 92 Z M78 92 L57 44 H53 L61 92 Z" fill="#fff" />
  </>
);

const Diamond = () => (
  <>
    <polygon points="50,1 99,50 50,99 1,50" fill="#fff" stroke="#333" strokeWidth={1.5} />
    <polygon points="50,17 83,50 50,83 17,50" fill={yellow} />
  </>
);

const SIGNS: Record<string, () => ReactElement> = {
  // ---- Fareskilt (warning) ----
  fare_sving_h: () => <Triangle><path d="M44 76 V60 Q44 50 52 47 L60 44" fill="none" stroke={ink} strokeWidth={6.5} /></Triangle>,
  fare_sving_v: () => <Triangle><path d="M56 76 V60 Q56 50 48 47 L40 44" fill="none" stroke={ink} strokeWidth={6.5} /></Triangle>,
  // first a bend to the right, then one to the left, and the road goes on ahead (it does not curl back like a «?»)
  fare_svinger: () => <Triangle><path d="M43 76 V69.5 C43 62 59 63 59 54.5 C59 46.5 47 47.5 47 40" fill="none" stroke={ink} strokeWidth={6.5} /></Triangle>,
  fare_bakke_ned: () => (
    <Triangle>
      <path d="M34 75 H69 L34 57 Z" fill={ink} />
      <text x={56} y={63} textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight={700} fontSize={9.5} fill={ink}>10%</text>
    </Triangle>
  ),
  fare_smalere: () => <Triangle><path d="M36 77 L42 62 V45 M64 77 L58 62 V45" fill="none" stroke={ink} strokeWidth={5} /></Triangle>,
  fare_ujevn: () => <Triangle><path d="M28 72 H36 Q41 58 46 72 H54 Q59 58 64 72 H72" fill="none" stroke={ink} strokeWidth={5} strokeLinejoin="round" /></Triangle>,
  fare_vegarbeid: () => (
    <Triangle>
      <path d="M44 52 L50 62 L46 74 M50 62 L56 72 M45 54 L57 58 L63 70" fill="none" stroke={ink} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={41} cy={47} r={4.4} fill={ink} />
      <path d="M60 75 L64 66 L70 75 Z M30 75 Q36 64 42 75 Z" fill={ink} />
    </Triangle>
  ),
  fare_glatt: () => (
    <Triangle>
      <Place x={38.5} y={46} s={0.77}><CarRear c={ink} /></Place>
      <path d="M43 65 Q38.5 68.5 44 71.5 Q49 74 43.5 77 M57 65 Q61.5 68.5 56 71.5 Q51 74 56.5 77" fill="none" stroke={ink} strokeWidth={2.4} />
    </Triangle>
  ),
  fare_gangfelt: () => (
    <Triangle>
      <Place x={33} y={40} s={0.8}><Person c={ink} sw={4.4} /></Place>
      <path d="M28 76 H72" stroke={ink} strokeWidth={4} strokeDasharray="5 3" />
    </Triangle>
  ),
  fare_barn: () => (
    <Triangle>
      <Place x={28} y={42} s={0.85}><Runner c={ink} /></Place>
      <Place x={47} y={50} s={0.65}><Runner c={ink} /></Place>
    </Triangle>
  ),
  fare_sykkel: () => <Triangle><Place x={30} y={52} s={0.92}><Bicycle c={ink} sw={3.2} /></Place></Triangle>,
  fare_elg: () => <Triangle><Place x={28} y={48.5} s={0.8}><Moose c={ink} /></Place></Triangle>,
  fare_lyssignal: () => (
    <Triangle>
      <rect x={42} y={38} width={16} height={38} rx={4} fill={ink} />
      <circle cx={50} cy={45} r={4.5} fill="#e3242b" />
      <circle cx={50} cy={57} r={4.5} fill="#ffc400" />
      <circle cx={50} cy={69} r={4.5} fill="#1fa65a" />
    </Triangle>
  ),
  fare_jernbane_bom: () => (
    <Triangle>
      <g fill={ink}>
        <rect x={35} y={55} width={30} height={4.5} /><rect x={35} y={65.5} width={30} height={4.5} />
        <rect x={35.5} y={52} width={4} height={24} /><rect x={48} y={50} width={4} height={26} /><rect x={60.5} y={52} width={4} height={24} />
      </g>
    </Triangle>
  ),
  fare_jernbane: () => <Triangle><Place x={29.5} y={49} s={0.76}><Locomotive c={ink} /></Place></Triangle>,
  fare_motende: () => (
    <Triangle>
      <ArrowDown cx={42} top={42} bottom={76} c={ink} hw={7} sw={2.6} />
      <ArrowUp cx={58} top={42} bottom={76} c={ink} hw={7} sw={2.6} />
    </Triangle>
  ),
  fare_ko: () => (
    <Triangle>
      <Place x={43.6} y={44.5} s={0.43}><CarRear c={ink} /></Place>
      <Place x={41.6} y={52.4} s={0.56}><CarRear c={ink} /></Place>
      <Place x={39.2} y={62} s={0.72}><CarRear c={ink} /></Place>
    </Triangle>
  ),
  fare_kryss: () => <Triangle><rect x={46} y={42} width={8} height={35} fill={ink} /><rect x={33} y={55} width={34} height={7} fill={ink} /></Triangle>,
  fare_rundkjoring: () => <Triangle><RoundArrows cx={50} cy={61} r={11} c={ink} sw={3.6} /></Triangle>,
  fare_annen: () => <Triangle><rect x={46.5} y={42} width={7} height={24} rx={2} fill={ink} /><circle cx={50} cy={72} r={4} fill={ink} /></Triangle>,

  // ---- Vikeplikt og forkjørsrett ----
  vikeplikt: () => (
    <>
      <path d="M4 10 H96 L50 94 Z" fill={red} stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
      <path d="M22 19 H78 L50 71 Z" fill="#fff" stroke="#fff" strokeWidth={3} strokeLinejoin="round" />
    </>
  ),
  stopp: () => (
    <>
      <polygon points={octagon(49)} fill="#fff" />
      <polygon points={octagon(45)} fill={red} />
      <text x={50} y={51} textAnchor="middle" dominantBaseline="central" fontFamily={SIGN_FONT} fontWeight={700} fontSize={29} fill="#fff" letterSpacing={1}>STOP</text>
    </>
  ),
  forkjorsveg: () => <Diamond />,
  slutt_forkjorsveg: () => <><Diamond /><Stripes cx={50} cy={50} r={33} shape="diamond" /></>,
  moteplikt: () => (
    <Ring>
      <ArrowDown cx={39} top={24} bottom={76} c={ink} hw={9} sw={3.6} />
      <ArrowUp cx={61} top={30} bottom={76} c={red} hw={7} sw={2.6} />
    </Ring>
  ),
  forkjorsrett_mote: () => (
    <BluePlate>
      <ArrowUp cx={61} top={18} bottom={82} c="#fff" hw={11} sw={4.2} />
      <ArrowDown cx={37} top={30} bottom={82} c={red} hw={7} sw={2.6} />
    </BluePlate>
  ),

  // ---- Forbudsskilt (prohibition) ----
  innkjoring_forbudt: () => (
    <>
      <circle cx={50} cy={50} r={49} fill="#fff" />
      <circle cx={50} cy={50} r={47} fill={red} />
      <rect x={19} y={42} width={62} height={16} fill="#fff" />
    </>
  ),
  forbudt_alle: () => <Ring />,
  forbudt_motorvogn: () => <Ring><Place x={23} y={38}><CarSide c={ink} /></Place></Ring>,
  forbudt_venstresving: () => (
    <Ring>
      <path d="M58 80 V52 Q58 42 48 42 H38" fill="none" stroke={ink} strokeWidth={8} />
      <path d="M40 30 L24 42 L40 54 Z" fill={ink} />
      <Strike />
    </Ring>
  ),
  forbudt_hoyresving: () => (
    <Ring>
      <path d="M42 80 V52 Q42 42 52 42 H62" fill="none" stroke={ink} strokeWidth={8} />
      <path d="M60 30 L76 42 L60 54 Z" fill={ink} />
      <Strike />
    </Ring>
  ),
  forbudt_uvending: () => (
    <Ring>
      <path d="M60 80 V44 A11 11 0 0 0 38 44 V58" fill="none" stroke={ink} strokeWidth={7} />
      <path d="M28 56 L38 72 L48 56 Z" fill={ink} />
      <Strike />
    </Ring>
  ),
  forbikjoring_forbudt: () => (
    <Ring>
      <Place x={19} y={39}><CarRear c={red} /></Place>
      <Place x={51} y={39}><CarRear c={ink} /></Place>
    </Ring>
  ),
  slutt_forbikjoring: () => (
    <EndDisc>
      <Place x={19} y={39}><CarRear c={grey} /></Place>
      <Place x={51} y={39}><CarRear c={grey} /></Place>
    </EndDisc>
  ),
  fartssone_30: () => (
    <>
      <rect x={14} y={2} width={72} height={96} rx={6} fill="#fff" stroke="#b9bec5" strokeWidth={2} />
      <g transform="translate(23 10) scale(0.54)"><Ring><SignNumber n={30} /></Ring></g>
      <text x={50} y={84} textAnchor="middle" fontFamily={SIGN_FONT} fontWeight={700} fontSize={17} fill={ink} letterSpacing={1}>SONE</text>
    </>
  ),
  stans_forbudt: () => <Ring fill={blue}><path d="M25 25 L75 75 M75 25 L25 75" stroke={red} strokeWidth={8} data-exempt="" /></Ring>,
  parkering_forbudt: () => <Ring fill={blue}><Strike /></Ring>,

  // ---- Påbudsskilt (mandatory) ----
  pabudt_rett_fram: () => <BlueDisc><ArrowUp cx={50} top={17} bottom={83} c="#fff" hw={15} sw={6} /></BlueDisc>,
  pabudt_hoyre: () => (
    <BlueDisc>
      <path d="M42 84 V56 Q42 42 56 42 H62" fill="none" stroke="#fff" strokeWidth={12} />
      <path d="M60 24 L80 42 L60 60 Z" fill="#fff" />
    </BlueDisc>
  ),
  pabudt_felt_hoyre: () => (
    <BlueDisc>
      <path d="M27 27 L62 62" stroke="#fff" strokeWidth={12} />
      <path d="M78 78 L74 51 L51 74 Z" fill="#fff" />
    </BlueDisc>
  ),
  rundkjoring: () => <BlueDisc><RoundArrows cx={50} cy={50} r={24} c="#fff" sw={7} /></BlueDisc>,

  // ---- Opplysningsskilt (information) ----
  // gangveg, sykkelveg, gang- og sykkelveg (518–522) are round and blue but count as opplysningsskilt in Norway
  gangveg: () => <BlueDisc><Place x={27} y={24} s={1.25}><Person c="#fff" /></Place></BlueDisc>,
  sykkelveg: () => <BlueDisc><Place x={22} y={34} s={1.3}><Bicycle c="#fff" sw={3.4} /></Place></BlueDisc>,
  gang_sykkelveg: () => (
    <BlueDisc>
      <Place x={31} y={17} s={0.88}><Bicycle c="#fff" sw={3.2} /></Place>
      <Place x={37} y={47} s={0.78}><Person c="#fff" /></Place>
    </BlueDisc>
  ),

  gangfelt: () => (
    <BluePlate>
      <path d="M50 11 L90 84 H10 Z" fill="#fff" stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
      <Place x={32} y={36} s={0.92}><Person c={ink} sw={4.4} /></Place>
      <path d="M24 80 H76" stroke={ink} strokeWidth={5} strokeDasharray="6 3.5" />
    </BluePlate>
  ),
  motorveg: () => <BluePlate><Motorway /></BluePlate>,
  slutt_motorveg: () => <BluePlate><Motorway /><line x1={14} y1={14} x2={86} y2={86} stroke={red} strokeWidth={9} /></BluePlate>,
  motortrafikkveg: () => (
    <BluePlate>
      <path d="M30 46 L36 30 H64 L70 46 Z" fill="#fff" />
      <path d="M36 44 L40 34 H60 L64 44 Z" fill={blue} />
      <rect x={22} y={45} width={56} height={22} rx={5} fill="#fff" />
      <rect x={26} y={66} width={11} height={10} rx={2} fill="#fff" />
      <rect x={63} y={66} width={11} height={10} rx={2} fill="#fff" />
      <circle cx={32} cy={55} r={4} fill={blue} /><circle cx={68} cy={55} r={4} fill={blue} />
    </BluePlate>
  ),
  envegskjoring: () => <BluePlate><ArrowUp cx={50} top={14} bottom={86} c="#fff" hw={17} sw={7} /></BluePlate>,
  blindveg: () => <BluePlate><rect x={42} y={36} width={16} height={50} fill="#fff" /><rect x={22} y={18} width={56} height={18} fill={red} /></BluePlate>,
  parkering: () => (
    <BluePlate>
      <text x={50} y={53} textAnchor="middle" dominantBaseline="central" fontFamily="Arial, sans-serif" fontWeight={700} fontSize={70} fill="#fff">P</text>
    </BluePlate>
  ),
  moteplass: () => (
    <BluePlate>
      <text x={50} y={53} textAnchor="middle" dominantBaseline="central" fontFamily="Arial, sans-serif" fontWeight={700} fontSize={66} fill="#fff">M</text>
    </BluePlate>
  ),
  kollektivfelt: () => (
    <BluePlate>
      <rect x={22} y={20} width={56} height={34} rx={5} fill="#fff" />
      <rect x={27} y={25} width={46} height={13} rx={2} fill={blue} />
      <circle cx={33} cy={56} r={5} fill="#fff" /><circle cx={67} cy={56} r={5} fill="#fff" />
      <text x={50} y={78} textAnchor="middle" fontFamily={SIGN_FONT} fontWeight={700} fontSize={13} fill="#fff" letterSpacing={0.5}>KOLLEKTIV</text>
    </BluePlate>
  ),
  tunnel: () => (
    <BluePlate>
      <path d="M12 86 V54 A38 38 0 0 1 88 54 V86 Z" fill="#fff" />
      <path d="M28 86 V58 A22 22 0 0 1 72 58 V86 Z" fill={ink} />
    </BluePlate>
  ),
  gatetun: () => (
    <BluePlate wide>
      <path d="M14 50 L32 34 L50 50 V78 H14 Z" fill="none" stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
      <rect x={27} y={62} width={10} height={16} fill="#fff" />
      <Place x={52} y={38}><Person c="#fff" sw={4.6} /></Place>
      <Place x={80} y={52} s={0.66}><Runner c="#fff" /></Place>
      <circle cx={104} cy={74} r={4} fill="#fff" />
      <Place x={98} y={30} s={0.62}><CarSide c="#fff" /></Place>
    </BluePlate>
  ),
  gagate: () => (
    <BluePlate wide>
      <Place x={34} y={24} s={1.3}><Person c="#fff" sw={4.6} /></Place>
      <Place x={76} y={40} s={0.9}><Person c="#fff" /></Place>
    </BluePlate>
  ),
};

for (const n of [30, 40, 50, 60, 70, 80, 90, 100, 110]) SIGNS[`fart_${n}`] = () => <Ring><SignNumber n={n} /></Ring>;
for (const n of [60, 70, 80]) SIGNS[`slutt_fart_${n}`] = () => <EndDisc><SignNumber n={n} c={grey} /></EndDisc>;

export const WIDE_SIGNS = new Set(['gatetun', 'gagate']);
export const SIGN_KEYS = Object.keys(SIGNS);

/** The sign's drawing, to be placed inside an <svg viewBox="0 0 100 100"> (or 140×100 for wide signs). */
export const signGraphic = (key: string): ReactElement | null => SIGNS[key]?.() ?? null;
