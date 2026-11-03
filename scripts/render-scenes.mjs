// Рендер всех сцен параллельно: npm run scenes [-- части].
// Процессор занят сборкой сцены и сжатием картинки почти половину времени, поэтому несколько процессов Godot заметно быстрее одного.
// Манифест пишется, только когда все части закончились без ошибок: сцена с нарушением останавливает свою часть.
import { spawn } from 'node:child_process';

const parts = Number(process.argv[2]) || 4;
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

const jobs = [];
for (let k = 1; k <= parts; k++) {
  jobs.push(godot(['--path', 'scenes3d', '--', `part=${k}/${parts}`, `dir=${dir}`], `часть ${k}`));
}
const results = await Promise.all(jobs);
const failed = results.filter(r => r.code !== 0);
if (failed.length) {
  console.error(`Не закончились ${failed.length} из ${parts} частей, манифест не обновлён.`);
  process.exit(1);
}
const { code } = await godot(['--headless', '--path', 'scenes3d', '--', 'manifest=1', `dir=${dir}`], 'манифест');
if (code !== 0) {
  console.error('Манифест не записан.');
  process.exit(1);
}
const total = results.reduce((sum, r) => sum + r.done, 0);
console.log(`Готово: ${total} сцен за ${Math.round((Date.now() - started) / 1000)} с, частей: ${parts}.`);
