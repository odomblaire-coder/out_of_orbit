const R=50;
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.1,200); cam.rotation.order='YXZ';
const rend=new THREE.WebGLRenderer({antialias:true}); rend.setPixelRatio(Math.min(devicePixelRatio,2)); rend.setSize(innerWidth,innerHeight); document.body.prepend(rend.domElement);

// ---- marker wall texture (painted in canvas: streaky green + wobbly navy shapes)
function rnd(a,b){return a+Math.random()*(b-a)}
function makeWall(){
  const W=4096,H=2048,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  g.fillStyle='#5b7336';g.fillRect(0,0,W,H);
  const greens=['#4d6430','#566c33','#5f7a38','#6a8440','#485e2d','#738c44'];
  g.lineCap='round';
  for(let i=0;i<2600;i++){ // overlapping marker strokes
    const x=rnd(0,W),y=rnd(0,H),len=rnd(70,240),a=-.7+rnd(-.3,.3);
    g.strokeStyle=greens[i%6];g.globalAlpha=.11;g.lineWidth=rnd(26,62);
    for(const dx of [-W,0,W]){g.beginPath();g.moveTo(x+dx,y);g.lineTo(x+dx+Math.cos(a)*len,y+Math.sin(a)*len);g.stroke()}
  }
  g.globalAlpha=1;
  function shape(kind,x,y,s,rot,col,al){
    const lat=(y/H-.5)*Math.PI,st=Math.min(1/Math.cos(lat),4);
    g.save();g.translate(x,y);g.scale(st,1);g.rotate(rot);g.scale(s,s);g.fillStyle=col;g.globalAlpha=al;g.beginPath();
    if(kind==0){for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=(i%2?.46:1)*(1+rnd(-.05,.05));i?g.lineTo(Math.cos(a)*r,Math.sin(a)*r):g.moveTo(Math.cos(a)*r,Math.sin(a)*r)}}
    else if(kind==1){g.arc(0,0,1,-2.2,2.2,false);g.arc(.45,0,1.316,2.48,-2.48,true)}
    else{const p=rnd(0,6);for(let i=0;i<=20;i++){const a=i/20*Math.PI*2,r=.8+.14*Math.sin(a*3+p)+.08*Math.cos(a*2+p);i?g.lineTo(Math.cos(a)*r,Math.sin(a)*r):g.moveTo(Math.cos(a)*r,Math.sin(a)*r)}}
    g.closePath();g.fill();g.restore();
  }
  for(let i=0;i<190;i++){
    const kind=i%3,x=rnd(0,W),lat=rnd(-1.25,1.25),y=(.5-lat/Math.PI)*H,s=rnd(55,150),rot=rnd(-.5,.5)+(kind==1?rnd(0,6):0);
    for(const dx of [-W,0,W]){ // two passes in slightly different inks = marker overlap
      shape(kind,x+dx,y,s,rot,'#1a171a',.93);
      shape(kind,x+dx+rnd(-4,4),y+rnd(-4,4),s*.97,rot,'#2a2630',.35);
    }
  }
  g.globalAlpha=1; // paper grain
  for(let i=0;i<60000;i++){g.fillStyle=Math.random()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.06)';g.fillRect(rnd(0,W),rnd(0,H),rnd(1,3),rnd(1,3))}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=rend.capabilities.getMaxAnisotropy();return t;
}
const wall=new THREE.Mesh(new THREE.SphereGeometry(R,64,40),new THREE.MeshBasicMaterial({map:makeWall(),side:THREE.BackSide}));
scene.add(wall);

// ---- portrait: a curved patch on the inside of the sphere, facing -z
function patchGeo(r,aw,ah){const nx=24,ny=32,pos=[],uv=[],idx=[];
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const u=i/nx,v=j/ny,a=(u-.5)*aw,b=(v-.5)*ah;
    pos.push(r*Math.sin(a)*Math.cos(b),r*Math.sin(b),-r*Math.cos(a)*Math.cos(b));uv.push(u,v)}
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*(nx+1)+i;idx.push(k,k+1,k+nx+1,k+1,k+nx+2,k+nx+1)}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);return geo}
const pMat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false});
const bMat=new THREE.MeshBasicMaterial({color:0x14143a,side:THREE.DoubleSide});
const portrait=new THREE.Mesh(patchGeo(49.5,.6,.8),pMat), border=new THREE.Mesh(patchGeo(49.7,.63,.84),bMat);
scene.add(portrait);
function setPortrait(t,aspect){t.encoding=THREE.sRGBEncoding;pMat.map=t;pMat.needsUpdate=true;
  let aw=.62,ah=aw/aspect;if(ah>1.1){ah=1.1;aw=ah*aspect}
  portrait.geometry.dispose();border.geometry.dispose();
  portrait.geometry=patchGeo(49.5,aw,ah);border.geometry=patchGeo(49.7,aw+.03,ah+.04)}
new THREE.TextureLoader().load("portrait.webp",t=>setPortrait(t,t.image.width/t.image.height));
document.getElementById('f').onchange=e=>{const f=e.target.files[0];if(!f)return;
  new THREE.TextureLoader().load(URL.createObjectURL(f),t=>setPortrait(t,t.image.width/t.image.height))};

// ---- look-around controls
const dom=rend.domElement;let yaw=-2.6,pitch=0,vy=0,vp=0,drag=false,lx=0,ly=0,auto=true;
dom.addEventListener('pointerdown',e=>{drag=true;auto=false;lx=e.clientX;ly=e.clientY;dom.setPointerCapture(e.pointerId);dom.style.cursor='grabbing'});
dom.addEventListener('pointermove',e=>{if(!drag)return;const k=.0042*cam.fov/75;vy=(e.clientX-lx)*k;vp=(e.clientY-ly)*k;yaw+=vy;pitch+=vp;lx=e.clientX;ly=e.clientY});
const up=()=>{drag=false;dom.style.cursor='grab'};dom.addEventListener('pointerup',up);dom.addEventListener('pointercancel',up);
addEventListener('wheel',e=>{cam.fov=Math.max(40,Math.min(95,cam.fov+e.deltaY*.04));cam.updateProjectionMatrix()},{passive:true});
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();rend.setSize(innerWidth,innerHeight)});
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clock=new THREE.Clock();
(function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);
  if(reduce&&auto){yaw=0;auto=false}
  if(auto)yaw+=(0-yaw)*dt*.55; // opening drift: patterns first, then the portrait settles into view
  else if(!drag){yaw+=vy;pitch+=vp;vy*=.93;vp*=.93}
  pitch=Math.max(-1.3,Math.min(1.3,pitch));
  cam.rotation.set(pitch,yaw,0);rend.render(scene,cam);
})();