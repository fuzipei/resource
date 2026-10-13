import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../public/skins/',import.meta.url));
const fmt=n=>Number(n.toFixed(2));
const path=(d,fill,opacity=1,extra='')=>`<path d="${d}" fill="${fill}" opacity="${opacity}" ${extra}/>`;
const line=(d,color,width=1,opacity=1)=>path(d,'none',opacity,`stroke="${color}" stroke-width="${width}"`);
const group=(body,x=0,y=0,scale=1,opacity=1)=>`<g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">${body}</g>`;
const circle=(x,y,r,color,opacity=1)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
const rect=(x,y,w,h,color,opacity=1,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${color}" opacity="${opacity}"/>`;

const palettes={
 ink:{light:['#f3f4ef','#e7ece6','#87958b','#53655a','#b36255'],dark:['#172521','#253832','#496358','#799285','#ad7164']},
 zen:{light:['#e9eff2','#d5e1e8','#869dad','#415b74','#ddbd8c'],dark:['#111e30','#1b3048','#293f55','#0b1727','#e8bf85']},
 jade:{light:['#eef4ed','#dbe9dc','#9bb8a1','#537c65','#d9bc81'],dark:['#142a25','#213c31','#45654f','#264c3b','#a5b99c']},
 changan:{light:['#f3e4dc','#e5b799','#bf8b77','#755951','#edb975'],dark:['#2a222c','#694742','#624447','#2c2b35','#e5aa65']},
 porcelain:{light:['#edf5f9','#d8eaf3','#b6d2e2','#688fa9','#c8ddeb'],dark:['#152635','#223e51','#52768d','#335670','#d5e6ea']},
 obsidian:{light:['#efeee8','#e4e2d8','#b3a181','#877348','#bda57a'],dark:['#181a1b','#222628','#786951','#a58a57','#c8ae7b']}
};

function leafSpray(color,opacity=1){
 let body=line('M-8 54 Q12 12 65 -20',color,1.1);
 const leaves=[[-3,44,-65],[4,33,18],[12,24,-50],[20,15,27],[31,6,-29],[42,-4,37],[57,-15,-14]];
 for(const [x,y,a] of leaves)body+=`<use href="#bamboo-leaf" fill="${color}" transform="translate(${x} ${y}) rotate(${a})"/>`;
 return `<g opacity="${opacity}">${body}</g>`;
}
function bamboo(x,y,height,width,color,opacity,lean=0){
 let body=path(`M0 0 Q${lean*.4} ${-height*.55} ${lean} ${-height} L${lean+width} ${-height} Q${width+lean*.4} ${-height*.55} ${width} 0Z`,color);
 for(let i=1;i<height/98;i++){const y=-i*98,dx=lean*i*98/height;body+=line(`M${fmt(dx-2)} ${y} L${fmt(dx+width+2)} ${y-1}`,'#dcebd8',2,.48)}
 return group(body,x,y,1,opacity);
}
function mountains(color,opacity=1){
 const points=[[-300,1060],[-60,1001],[90,979],[205,943],[311,936],[408,882],[485,834],[520,782],[541,773],[577,830],[624,804],[679,701],[715,628],[739,609],[756,598],[778,650],[800,736],[833,715],[874,754],[935,850],[1016,831],[1133,889],[1248,878],[1334,925],[1403,885],[1476,871],[1552,909],[1720,923],[1900,945],[2200,1036]];
 let d=`M${points[0].join(' ')}`;
 for(let i=0;i<points.length-1;i++){const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],e=points[Math.min(points.length-1,i+2)];d+=`C${fmt(b[0]+(c[0]-a[0])*.13)} ${fmt(b[1]+(c[1]-a[1])*.13)} ${fmt(c[0]-(e[0]-b[0])*.13)} ${fmt(c[1]-(e[1]-b[1])*.13)} ${c.join(' ')}`}
 return `<g mask="url(#mountain-fade)">${path(d+'V1180H-300Z',color,opacity)}</g>`;
}
function pine(color){
 let tree=path('M-10 218C-3 170 2 111-10 49C-16 13-11-31-4-65L8-70C2-22 4 19 18 60C34 108 13 180 8 222Z',color);
 tree+=line('M2 61C-39 29-57-12-102-40M12 101C57 52 82 21 138 8M-4 4C42-26 51-54 82-82',color,7);
 for(const [x,y,s] of [[-102,-40,1],[-65,-15,.82],[140,8,.98],[97,37,.75],[82,-82,.7],[-8,-68,.67]]){
  let cluster=path('M-67 10Q-61-3-46-5Q-52-18-25-19Q-10-29 5-17Q29-22 42-9Q61-6 68 8Q35 15 4 12Q-30 19-67 10Z',color);
  for(let i=0;i<15;i++){const px=-54+i*8;cluster+=line(`M${px} 9l${i%2?6:-5} -${8+i%4*3}`,color,.8,.55)}
  tree+=group(cluster,x,y,s);
 }
 return tree;
}
function roof(w,color,trim){
 let body=path(`M${-w*.62} 11Q${-w*.39} 15 ${-w*.18} -8Q-16-18 0-33Q20-15 ${w*.19} -7Q${w*.4} 15 ${w*.62} 11Q${w*.49} 35 ${w*.3} 31L${-w*.3} 31Q${-w*.49} 35 ${-w*.62} 11Z`,color);
 body+=line(`M${-w*.61} 12Q${-w*.37} 27 0 20Q${w*.37} 27 ${w*.61} 12`,trim,2,.65);
 for(let i=-7;i<=7;i++){const x=i*w*.06;body+=line(`M${x*.25} ${-24+Math.abs(i)*2}Q${x*.55} 5 ${x} 24`,trim,.8,.2)}
 body+=line('M0-31v-13m-3 4h6',color,2);
 return body;
}
function lantern(x,y,color,scale=1){
 return group(circle(0,21,45,'url(#lantern-glow)',.45)+line('M0-24V0',color,1.2,.7)+path('M-10 2Q-17 20-10 37Q0 41 10 37Q17 20 10 2Z',color,.88)+line('M-8 3H8M-8 36H8M0 39v18',color,2)+line('M-3 7V33M3 7V33','#fff0c4',1,.4),x,y,scale);
}
function pavilion(color,trim,light,night){
 let body=rect(-122,31,244,387,color,.86)+rect(-108,72,216,133,trim,.13);
 for(const x of [-103,-45,42,96])body+=rect(x,55,9,375,trim,.42);
 body+=rect(-93,82,186,96,light,night?.25:.11,1);
 for(let x=-93;x<=93;x+=23)body+=line(`M${x} 82V178`,color,3,.85);
 for(let y=82;y<=178;y+=24)body+=line(`M-93 ${y}H93`,color,3,.85);
 body+=group(roof(312,color,trim),0,0)+group(roof(278,color,trim),-8,232);
 body+=line('M-148 450H151M-135 435H138',color,8,.9);
 body+=lantern(-125,98,light,.9)+lantern(91,301,light,.8);
 return body;
}
function smallTemple(x,y,w,color,light,opacity=1){
 let body=rect(-w*.32,12,w*.64,w*.25,color)+roof(w,color,light);
 for(let i=-2;i<=2;i++)body+=rect(i*w*.1-3,32,6,14,light,.4);
 return group(body,x,y,1,opacity);
}
function twig(color){return line('M0 500C16 378-5 243-71 129C-104 73-135 47-178 26M-43 184C6 140 26 108 35 62M-70 132C-57 89-39 44-38 0M-13 305C52 247 63 210 95 176M-89 100C-146 102-176 85-211 62',color,2.6,.85)}
function blossom(x,y,s,color,edge){let body='';for(let i=0;i<5;i++)body+=`<ellipse cx="0" cy="-6" rx="4.8" ry="6.7" fill="${color}" stroke="${edge}" stroke-width=".45" transform="rotate(${i*72})"/>`;body+=circle(0,0,2.5,edge,.7);return group(body,x,y,s)}
function scene(name,dark){
 const [bg,glow,far,ink,accent]=palettes[name][dark?'dark':'light'];let sky='',land='',extra='';
 if(name==='ink'){
  sky=circle(1720,155,28,'url(#sun)',.8)+line('M1150 176q9-11 21-3q8-16 22-14M1245 145q8-7 15-2q8-11 16-10',ink,1.6,.35);
  land=group(mountains(far,.2),120,-95)+group(mountains(far,.18),390,5,.8)+mountains(ink,.09);
  land+=path('M0 1025Q240 971 428 1003T809 975Q973 936 1118 960T1493 974Q1704 893 1920 964V1080H0Z',far,.1);
  land+=group(pine(ink),1840,860,.7,.58)+path('M1590 1080Q1656 995 1737 989Q1816 954 1920 975V1080Z',ink,.1);
  land+=group(path('M-64 3Q-37 19 37 13L60 3Z',ink,.7)+path('M-28 2v-16q20-20 47 0v15Z',ink,.42)+line('M0 0v-54M-14-7l15-35 31 41',ink,1.6,.65),911,882,.85);
  land+=line('M790 908h167M844 917h167M1512 1014h146',ink,1,.12);
 }else if(name==='zen'){
  sky=circle(1815,145,88,'url(#moon-halo)',.34)+circle(1815,145,40,dark?'#e8ddc5':accent,dark?.86:.45)+path('M1828 108Q1792 138 1814 184Q1781 180 1776 153Q1770 123 1803 107Z',bg,.08);
  for(const [x,y,a,s] of [[1850,0,155,1.2],[1900,80,162,1],[1750,-20,105,.7],[1990,185,205,1.2]])sky+=`<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})">${leafSpray(ink,.8)}</g>`;
  land=group(mountains(far,.72),0,60)+group(mountains(ink,.6),-200,170,.95);
  land+=path('M0 1030Q205 967 433 1012T902 1017Q1277 952 1537 1005L1920 972V1080H0Z',ink,.7);
  for(const [x,y,s] of [[82,999,.28],[204,1019,.4],[1515,983,.33]])land+=group(pine(ink),x,y,s,.6);
  land+=group(pavilion(ink,far,accent,dark),1900,604,1);
 }else if(name==='jade'){
  for(const [x,y,a,s,o] of [[10,25,5,1.5,.4],[80,50,-50,1.5,.22],[440,-20,100,1,.22],[1210,-32,108,1.2,.22],[1640,0,132,1.8,.48],[1835,130,165,1.5,.7],[1880,240,185,1,.48]])sky+=`<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})">${leafSpray(ink,o)}</g>`;
  land=group(mountains(far,.13),-100,220,.8)+path('M0 1044Q272 995 576 1038Q946 1076 1290 1008Q1598 963 1920 1021V1080H0Z',far,.18);
  for(const [x,h,w,o,l] of [[1730,1080,13,.32,30],[1825,1240,22,.55,-40],[1880,1160,15,.4,34],[1930,1200,28,.64,-55],[50,830,14,.1,-34],[145,540,10,.1,26]])land+=bamboo(x,1120,h,w,ink,o,l);
  for(const [x,y,a,s,o] of [[1785,438,180,1.7,.4],[1860,616,143,1.4,.6],[1715,814,205,1.3,.46],[1895,969,188,1.5,.55],[105,1000,190,.9,.17]])land+=`<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})">${leafSpray(ink,o)}</g>`;
  land+=group(path('M-24 5h48l-6 54h-36ZM-32 62h64v5h-64Z',ink,.48)+group(roof(53,ink,far),0,-20)+rect(-8,-9,16,19,bg,.7),1635,1005,1,.45);
 }else if(name==='changan'){
  sky=line('M1930-7C1852 11 1780 35 1713 20M1864 7q-13 83-78 104M1779 31q-25 24-77 25',ink,4,.65);
  for(let i=0;i<14;i++){const x=1740+(i*47%210),y=5+(i*31%112);sky+=`<use href="#maple-leaf" fill="${dark?'#945347':'#b97259'}" transform="translate(${x} ${y}) rotate(${i*29}) scale(${.5+i%3*.14})" opacity="${.25+i%3*.08}"/>`}
  land=circle(1460,755,105,'url(#sun)',.24)+group(mountains(far,.2),20,193,.94);
  for(let i=0;i<18;i++){const x=90+i*105,y=855+(i*37%64),w=42+(i*23%48);land+=smallTemple(x,y,w,far,accent,.5)}
  land+=path('M0 1060L182 1024 319 1037 480 1014 694 1045 903 1004 1180 1049 1395 1018 1680 1053 1920 998V1080Z',ink,.4);
  for(const [x,y,w] of [[105,967,142],[491,976,122],[927,874,187],[1210,970,120],[1495,942,165]])land+=smallTemple(x,y,w,ink,accent,.7);
  land+=group(pavilion(ink,far,accent,dark),1930,572,1.28);
  for(let i=0;i<23;i++)land+=rect(80+i*69,1030+i%4*9,3+i%3,3,accent,dark?.65:.3);
 }else if(name==='porcelain'){
  sky=path('M1920 0H1714C1657 183 1668 388 1778 521C1856 614 1855 773 1814 1080H1920Z','url(#curtain)',.7);
  sky+=line('M1847 0C1789 230 1740 320 1857 573C1901 669 1854 869 1850 1080',far,2,.35);
  land=group(mountains(far,.13),120,80)+`<ellipse cx="1745" cy="648" rx="307" ry="351" fill="none" stroke="${far}" stroke-width="5" opacity=".24"/><ellipse cx="1750" cy="648" rx="322" ry="366" fill="none" stroke="${far}" stroke-width="1" opacity=".2"/>`;
  land+=group(twig(ink),1813,334,1,.66);
  const flowers=[[-174,26,.85],[-202,61,.7],[-143,72,.95],[-92,91,.86],[-47,149,.75],[-36,4,.9],[32,65,.84],[73,204,.75],[10,265,.8],[-25,343,.65],[-76,176,.75]];
  for(const [x,y,s] of flowers)land+=blossom(1813+x,334+y,s,dark?'#c7dce5':'#fbfdfe',far);
  let vase=path('M-20 0Q-17 34-29 51C-85 115-66 160-46 170Q0 183 46 170C66 160 85 115 29 51Q17 34 20 0Z','url(#vase)',.96,`stroke="${far}" stroke-width="1.3"`)+line('M-19 8h38M-21 28h42M-47 164q47 14 94 0',ink,2,.46);
  for(let i=0;i<9;i++){const x=(i%3-1)*26,y=76+Math.floor(i/3)*29;vase+=group(leafSpray(ink,.52),x,y,.29)}
  land+=group(vase,1813,800,.83)+group(twig(far),18,1030,.34,.3);
 }else{
  const ridges=['M1210 1080Q1390 926 1480 719Q1522 619 1583 616Q1631 444 1701 383Q1740 408 1782 513Q1854 545 1920 674','M1060 1080Q1284 997 1457 842Q1560 814 1622 718Q1700 582 1817 650Q1860 720 1920 744'];
  for(let i=0;i<6;i++)land+=group(line(ridges[i%2],ink,i===0?1.5:.75,.18+i*.04),i*5,i*20);
  for(let i=0;i<9;i++){const y=987+i*8;land+=line(`M-60 ${y}C177 ${y-164+i*8} 238 ${y+117} 477 ${y-22}S893 ${y-81} 1100 ${y+80}`,accent,i===3?1.3:.7,.1+i*.025)}
  land+=path('M0 1080Q217 1020 391 1062T853 1080H0Z',far,.06);
  for(const [x,y,r] of [[1730,384,1.4],[1600,810,1],[195,891,1.1],[512,960,1.3]])land+=circle(x,y,r,accent,.5);
 }
 const definitions=`<defs>
 <linearGradient id="mountain-alpha" x1="0" y1="0" x2="0" y2="1"><stop stop-color="white"/><stop offset=".48" stop-color="white" stop-opacity=".42"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><mask id="mountain-fade" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#mountain-alpha)"/></mask>
 <linearGradient id="air" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${bg}"/><stop offset=".62" stop-color="${bg}"/><stop offset="1" stop-color="${glow}"/></linearGradient>
 <linearGradient id="quiet"><stop stop-color="${bg}" stop-opacity=".12"/><stop offset=".26" stop-color="${bg}" stop-opacity=".42"/><stop offset=".68" stop-color="${bg}" stop-opacity=".25"/><stop offset="1" stop-color="${bg}" stop-opacity="0"/></linearGradient>
 <radialGradient id="sun"><stop stop-color="${accent}"/><stop offset="1" stop-color="${accent}" stop-opacity=".15"/></radialGradient>
 <radialGradient id="moon-halo"><stop stop-color="${accent}" stop-opacity=".25"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
 <radialGradient id="lantern-glow"><stop stop-color="${accent}" stop-opacity=".7"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
 <linearGradient id="curtain"><stop stop-color="${far}" stop-opacity=".02"/><stop offset=".6" stop-color="${far}" stop-opacity=".25"/><stop offset=".8" stop-color="${bg}" stop-opacity=".9"/><stop offset="1" stop-color="${far}" stop-opacity=".2"/></linearGradient>
 <linearGradient id="vase"><stop stop-color="${far}"/><stop offset=".38" stop-color="${dark?'#b8d3e0':'#fbfdff'}"/><stop offset=".72" stop-color="${dark?'#86aabd':'#dcecf5'}"/><stop offset="1" stop-color="${far}"/></linearGradient>
 <path id="bamboo-leaf" d="M0 0Q-8-26 2-63Q12-33 0 0Z"/>
 <path id="maple-leaf" d="M0 0L-6-15-16-12-13-22-27-30-9-28-10-45 1-35 12-50 12-31 27-36 21-21 36-19 18-10 20 0 7-5 2 10Z"/>
 </defs>`;
 return {bg,definitions,sky,land,extra};
}
await mkdir(root,{recursive:true});let total=0;
for(const name of Object.keys(palettes))for(const dark of [false,true])for(const mobile of [false,true]){
 const {definitions,sky,land,extra}=scene(name,dark),width=mobile?640:1920,height=mobile?1120:1080;
 const art=mobile?group(land,-512,372,.6)+group(sky,-608,40,.65):land+sky;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="none" stroke-linecap="round" stroke-linejoin="round">${definitions}${rect(0,0,width,height,'url(#air)')}${art}${rect(0,0,width,height,'url(#quiet)')}${extra}</svg>`;
 const filename=`guofeng-${name}${dark?'-dark':''}${mobile?'-mobile':''}-v2.svg`;
 await writeFile(root+filename,svg);total+=Buffer.byteLength(svg);
}
console.log(`Generated 24 SVG scenes, ${Math.round(total/1024)} KiB total`);
