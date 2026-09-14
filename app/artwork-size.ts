// Ask supported music image CDNs for display-sized artwork; never rewrite signed/unknown hosts.
export function artworkSize(value:string,size=160):string{
 try{const u=new URL(value);if(u.protocol!=='https:')return value;
 if(/(^|\.)music\.126\.net$/.test(u.hostname)){u.searchParams.set('param',`${size}y${size}`);return u.href}
 if(u.hostname==='y.gtimg.cn'&&/\/T002R\d+x\d+M000/.test(u.pathname)){const width=size<=160?150:size<=384?300:800;u.pathname=u.pathname.replace(/T002R\d+x\d+M000/,`T002R${width}x${width}M000`);return u.href}
 }catch{}return value;
}
