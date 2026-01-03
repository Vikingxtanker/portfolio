let target = 0, current = 0, velocity = 0;

const hero = document.querySelector('canvas');
const work = document.getElementById('work');
const title = document.querySelector('.work-title');
const lines = document.querySelectorAll('.work-list li');

addEventListener('wheel', e => {
  velocity += e.deltaY * 0.0009;
}, { passive:true });

function loop(){
  target += velocity;
  velocity *= 0.82;

  if (Math.abs(velocity) < 0.001)
    target += (target > 0.5 ? 1-target : -target) * 0.08;

  target = Math.max(0, Math.min(1, target));
  current += (target - current) * 0.08;

  hero.style.transform = `translateY(${-current * 22}vh)`;
  hero.style.opacity = 1 - current * 1.1;

  work.style.transform = `translateY(${(1-current)*100}%)`;
  work.style.opacity = Math.min(1, current * 1.2);

  title.style.opacity = Math.min(1, (current-0.15)*6);
  title.style.transform =
    `translateY(${(1-Math.min(1,(current-0.15)*6))*12}px)`;

  lines.forEach((li,i)=>{
    const p = Math.min(1, Math.max(0,(current-(0.22+i*0.06))*6));
    li.style.opacity = p;
    li.style.transform = `translateY(${(1-p)*14}px)`;
  });

  requestAnimationFrame(loop);
}
loop();
