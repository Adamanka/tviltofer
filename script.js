(() => {
  const canvas = document.getElementById('magicFlame');
  const stage = canvas?.parentElement;
  const ctx = canvas?.getContext('2d');
  if (!stage || !ctx) return;
  const artwork=stage.querySelector('img');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const silhouette = new Path2D('M260 370 C350 380 440 342 510 280 C610 190 650 125 720 132 C768 130 785 142 795 144 C792 129 795 112 807 103 C803 145 832 163 858 184 C893 213 906 255 890 294 C884 321 861 347 825 364 C846 324 861 278 850 230 C849 294 809 352 762 378 C783 335 793 284 779 252 C775 300 739 349 704 370 C706 328 742 290 724 260 C700 230 671 216 650 225 C590 245 536 282 491 314 C418 361 347 384 260 370 Z');
  const streams = [
    'M263 371 C455 378 556 177 708 163 C790 140 866 210 850 282 C845 320 834 345 826 361',
    'M272 374 C442 373 565 204 697 185 C766 170 820 218 791 295 C778 329 763 350 753 363',
    'M284 374 C441 369 558 233 670 212 C719 198 770 241 738 290 C714 320 709 348 707 360',
    'M489 304 C590 216 648 141 721 139 C766 135 790 157 807 164',
    'M664 152 C700 119 740 131 782 151 C811 163 807 132 806 112'
  ].map(path => new Path2D(path));
  // Reuse the glow gradient and particle sprite instead of blurring every spark.
  let heat;
  // Small emissive field gives the original flame flowing, turbulent light.
  const field=document.createElement('canvas');field.width=160;field.height=82;
  const fieldCtx=field.getContext('2d');
  const pixels=fieldCtx.createImageData(field.width,field.height);
  const light=pixels.data;
  const grid=Array.from({length:field.width*field.height},(_,i)=>({x:i%160/160,y:Math.floor(i/160)/82}));
  let fieldTick=0;
  const turbulence=t=>{
    for(let i=0;i<grid.length;i++){
      const {x,y}=grid[i];
      const curl=Math.sin(x*15+y*9-t*1.4)*.55+Math.sin(x*29-y*17+t*2.1)*.3+Math.sin(y*41+x*13-t*3.2)*.15;
      const energy=Math.max(0,curl*.65+.25),k=i*4;
      light[k]=45+energy*140;light[k+1]=155+energy*95;light[k+2]=255;light[k+3]=energy*145;
    }
    fieldCtx.putImageData(pixels,0,0);
  };
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 24;
  const sparkCtx = sprite.getContext('2d');
  const glow = sparkCtx.createRadialGradient(12,12,0,12,12,12);
  glow.addColorStop(0,'#eaffff');glow.addColorStop(.12,'#b3ffff');
  glow.addColorStop(.3,'rgba(78,229,255,.45)');glow.addColorStop(1,'rgba(78,229,255,0)');
  sparkCtx.fillStyle=glow;sparkCtx.fillRect(0,0,24,24);
  const sparks=Array.from({length:64},(_,i)=>({phase:i/64,x:655+Math.random()*240,y:195+Math.random()*170,size:2+Math.random()*4}));
  let visible=false, raf=0, last=0, elapsed=0, tx=0, ty=0, mx=0, my=0;
  const clear=()=>{ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);};
  const fit=()=>{
    const {width,height}=stage.getBoundingClientRect();
    // Keep large desktop canvases below about 2 million pixels.
    const d=Math.min(devicePixelRatio||1,1.5,Math.sqrt(2000000/Math.max(1,width*height)));
    canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);
    ctx.setTransform(canvas.width/1000,0,0,canvas.height/510,0,0);
    heat=ctx.createLinearGradient(470,320,850,180);
    heat.addColorStop(0,'rgba(30,170,255,.035)');heat.addColorStop(.55,'rgba(93,245,255,.27)');heat.addColorStop(1,'rgba(224,255,255,.16)');
  };
  new ResizeObserver(fit).observe(stage);fit();
  stage.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch')return;
    const r=stage.getBoundingClientRect();
    tx=((event.clientX-r.left)/r.width-.5)*5;
    ty=((event.clientY-r.top)/r.height-.5)*5;
  },{passive:true});
  stage.addEventListener('pointerleave',()=>{tx=ty=0;});
  function draw(now){
    raf=0;
    if(!visible||document.hidden||motion.matches)return;
    raf=requestAnimationFrame(draw);
    if(now-last<32)return;
    const delta=Math.min((now-last)/1000,.05);last=now;elapsed+=delta;
    const t=elapsed;mx+=(tx-mx)*.09;my+=(ty-my)*.09;
    clear();ctx.setTransform(canvas.width/1000,0,0,canvas.height/510,0,0);
    ctx.translate(mx,my);ctx.save();ctx.clip(silhouette);
    // Animate the artwork's own flame texture, keeping the face untouched.
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    if(artwork.complete&&artwork.naturalWidth){
      const scale=artwork.naturalHeight/510;
      for(let y=100;y<390;y+=5){
        const shift=Math.sin(y*.045-t*2.4)*4+Math.sin(y*.021+t*1.6)*2;
        ctx.drawImage(artwork,0,y*scale,artwork.naturalWidth,5*scale,shift,y,1000,5.3);
      }
    }
    ctx.globalCompositeOperation='screen';
    ctx.fillStyle=heat;ctx.globalAlpha=.85+Math.sin(t*1.3)*.1;ctx.fill(silhouette);
    if(fieldTick++%2===0)turbulence(t);
    ctx.globalAlpha=.7;ctx.drawImage(field,0,0,1000,510);
    for(let i=0;i<streams.length;i++){
      const path=streams[i], pulse=.85+.15*Math.sin(t*2+i);
      ctx.setLineDash([]);ctx.globalAlpha=.16*pulse;ctx.lineWidth=22;
      ctx.strokeStyle='#5aeaff';ctx.stroke(path);
      ctx.globalAlpha=.25*pulse;ctx.lineWidth=4.5;
      ctx.strokeStyle='#b8ffff';ctx.stroke(path);
      // Light travels from the thin trail into the curled tongues of flame.
      ctx.setLineDash([38+i*7,95+i*13]);ctx.lineDashOffset=-t*(52+i*7)-i*43;
      ctx.globalAlpha=.48;ctx.lineWidth=2;ctx.strokeStyle='#e4ffff';ctx.stroke(path);
      ctx.lineWidth=8;ctx.globalAlpha=.15;ctx.strokeStyle='#63eeff';ctx.stroke(path);
    }
    ctx.setLineDash([]);
    for(let i=0;i<12;i++){
      const q=i/12,wave=Math.sin(t*1.8+i*.7)*12;
      ctx.beginPath();ctx.moveTo(420,347+q*7);
      ctx.bezierCurveTo(550,278+wave,594,182+q*65,719,160+q*55);
      ctx.bezierCurveTo(790,153+q*35,864,220+wave,809-q*65,367);
      ctx.lineWidth=7;ctx.globalAlpha=.075;ctx.strokeStyle='#3fdcff';ctx.stroke();
      ctx.lineWidth=1.4;ctx.globalAlpha=.22;ctx.strokeStyle='#b9ffff';ctx.stroke();
    }
    ctx.restore();ctx.globalCompositeOperation='screen';
    // Soft escaping tongues and embers continue above the existing curl.
    for(let i=0;i<6;i++){
      const x=697+i*30,y=150+Math.sin(i*.8)*15;
      const sway=Math.sin(t*1.7+i*1.3)*9,length=17+Math.sin(t*2+i)*8;
      ctx.beginPath();ctx.moveTo(x-5,y+8);
      ctx.bezierCurveTo(x-12+sway,y-8,x+11+sway,y-length,x+sway,y-length-9);
      ctx.bezierCurveTo(x+17+sway,y-7,x+9,y+4,x+5,y+8);
      ctx.closePath();ctx.fillStyle='#51dfff';ctx.globalAlpha=.13;ctx.fill();
    }
    for(const p of sparks){
      const age=(t*.2+p.phase)%1;
      const x=p.x+Math.sin(t*.65+p.phase*20)*6+age*12;
      const y=p.y-age*85,size=p.size*(1-age*.55);
      ctx.globalAlpha=Math.sin(age*Math.PI)*.85;
      ctx.drawImage(sprite,x-size,y-size,size*2,size*2);
      if(size>3){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-2,y+6+age*5);ctx.lineWidth=.7;ctx.strokeStyle='#a2faff';ctx.globalAlpha*=.5;ctx.stroke();}
    }
    ctx.globalAlpha=1;
  }
  const stop=()=>{cancelAnimationFrame(raf);raf=0;last=0;clear();};
  const resume=()=>{if(visible&&!document.hidden&&!motion.matches&&!raf){last=performance.now();raf=requestAnimationFrame(draw);}};
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)resume();else stop();},{rootMargin:'80px'}).observe(stage);

  motion.addEventListener('change',()=>{if(motion.matches)stop();else resume();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else resume();});
})();

(() => {
  const nav=document.querySelector('.mobile-shortcuts');
  const links=Array.from(nav.querySelectorAll('a'));
  const sections=links.map(link=>document.querySelector(link.getAttribute('href')));
  const small=matchMedia('(max-width:680px)');
  let pending=false;
  const update=()=>{
    pending=false;if(!small.matches)return;
    const line=innerHeight*.35;
    let current=0;
    sections.forEach((section,index)=>{if(section.getBoundingClientRect().top<=line)current=index;});
    if(innerHeight+scrollY>=document.documentElement.scrollHeight-4)current=links.length-1;
    links.forEach((link,index)=>{if(index===current)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
  };
  const schedule=()=>{if(small.matches&&!pending){pending=true;requestAnimationFrame(update);}};
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  small.addEventListener('change',schedule);
  update();
})();

(() => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  document.addEventListener('click',event=>{
    if(reduced.matches||!(event.target instanceof Element))return;
    const control=event.target.closest('.hero-actions a,nav.container-fluid ul:nth-child(2) a,.mobile-shortcuts a,.side-scroll a');
    if(!control)return;
    control.querySelector('.button-wave')?.remove();
    const wave=document.createElement('span');
    wave.className='button-wave';wave.setAttribute('aria-hidden','true');
    wave.style.setProperty('--wave-size',Math.hypot(control.clientWidth,control.clientHeight)*2+'px');
    control.append(wave);
    // Cleanup also works if the motion preference changes during the ripple.
    setTimeout(()=>wave.remove(),600);
  });
})();

(() => {
  const frame=document.querySelector('.intro-window');
  if(!frame||matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return;
  frame.classList.add('awaiting-growth');
  const observer=new IntersectionObserver(entries=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    frame.classList.remove('awaiting-growth');
    frame.classList.add('is-grown');
    observer.disconnect();
  },{threshold:.2});
  observer.observe(frame);
})();
