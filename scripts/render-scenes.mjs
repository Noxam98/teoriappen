// Рендер сцен: npm run scenes [-- части] [scene=vik-01,opp-11] [fps=5].
// Видеокарту ограничивает частота кадров: чем реже кадры, тем меньше средняя мощность.
// Замер на RTX 4070 Laptop: 5 кадров/с дают в среднем 12 Вт, 8 кадров/с дают 18 Вт. Лимит 20 Вт относится к среднему:
// короткие всплески при загрузке сцены так не срезать, это мог бы только системный предел мощности.
// Манифест пишется, только когда отрендерены все сцены и все части закончились без ошибок: сцена с нарушением останавливает свою часть.
import { spawn } from 'node:child_process';

const WATT_LIMIT = 20;
const args = process.argv.slice(2);
const option = name => args.find(a => a.startsWith(`${name}=`))?.slice(name.length + 1);
const parts = Number(args.find(a => /^\d+$/.test(a))) || 1;
const fps = Number(option('fps')) || 5;
const scene = option('scene');
const dir = '../src/assets/scenes';
const started = Date.now();

function godot(args, label) {
  return new Promise(resolve => {
    const p = spawn('godot', [...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let done = 0;
    p.stdout.on('data', d => {
      done += (String(d).match(/ код \d+,/g) ?? []).length;
      if (done && done % 10 === 0) process.stdout.write(`${label}: ${done}\n`);
    });
    p.stderr.on('data', d => {
      const text = String(d);
      if (/ОШИБКА|SCRIPT ERROR|SHADER ERROR/.test(text)) process.stderr.write(text);
    });
    p.on('close', code => resolve({ code, done }));
  });
}

// Мощность видеокарты раз в секунду, чтобы в конце показать, уложились ли в лимит.
const watts = [];
const meter = spawn('nvidia-smi', ['--query-gpu=power.draw', '--format=csv,noheader,nounits', '-lms', '1000'], { stdio: ['ignore', 'pipe', 'ignore'] });
meter.on('error', () => {});
meter.stdout?.on('data', d => {
  for (const line of String(d).split('\n')) {
    const w = parseFloat(line);
    if (w) watts.push(w);
  }
});

// Несколько процессов делят общий предел кадров, иначе нагрузка на видеокарту сложится.
const each = Math.max(1, Math.round(fps / parts));
const jobs = [];
for (let k = 1; k <= parts; k++) {
  const chosen = scene ? [`scene=${scene}`] : [];
  jobs.push(godot(['--max-fps', String(each), '--path', 'scenes3d', '--', ...chosen, `part=${k}/${parts}`, `dir=${dir}`], `часть ${k}`));
}
const results = await Promise.all(jobs);
meter.kill();
if (watts.length) {
  const mean = watts.reduce((sum, w) => sum + w, 0) / watts.length;
  console.log(`Видеокарта: в среднем ${mean.toFixed(1)} Вт, пик ${Math.max(...watts).toFixed(0)} Вт, лимит ${WATT_LIMIT} Вт.`);
  if (mean > WATT_LIMIT) console.error(`Средняя мощность выше лимита, уменьшите fps (сейчас ${fps}).`);
}
const failed = results.filter(r => r.code !== 0);
if (failed.length) {
  console.error(`Не закончились ${failed.length} из ${parts} частей, манифест не обновлён.`);
  process.exit(1);
}
const total = results.reduce((sum, r) => sum + r.done, 0);
if (scene) {
  console.log(`Готово: ${total} сцен за ${Math.round((Date.now() - started) / 1000)} с. Манифест не обновлён: после правки только этих сцен запустите godot --headless --path scenes3d -- manifest=1 dir=${dir}`);
  process.exit(0);
}
const { code } = await godot(['--headless', '--path', 'scenes3d', '--', 'manifest=1', `dir=${dir}`], 'манифест');
if (code !== 0) {
  console.error('Манифест не записан.');
  process.exit(1);
}
console.log(`Готово: ${total} сцен за ${Math.round((Date.now() - started) / 1000)} с, частей: ${parts}, предел ${fps} кадров/с.`);
