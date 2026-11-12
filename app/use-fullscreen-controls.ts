'use client';
import {useEffect,useState} from 'react';

export function useFullscreenControls(immersive:boolean){
 const [hidden,setHidden]=useState(false);
 useEffect(()=>{
  setHidden(false);if(!immersive)return;
  let timer:ReturnType<typeof setTimeout>;
  const protectedArea='.floating-player,.audio-source-positioner,.audio-source-popup';
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{
   const focused=document.activeElement instanceof Element&&!!document.activeElement.closest(protectedArea);
   const hovered=!!document.querySelector('.floating-player:hover,.audio-source-positioner:hover');
   const open=!!document.querySelector('.quality-dropdown[data-open="true"]');
   if(focused||hovered||open){schedule();return}setHidden(true);
  },2500)};
  const reveal=()=>{setHidden(false);schedule()};
  document.addEventListener('pointermove',reveal,{passive:true});
  document.addEventListener('pointerdown',reveal,{passive:true});
  document.addEventListener('keydown',reveal);
  document.addEventListener('focusin',reveal);
  schedule();
  return()=>{clearTimeout(timer);document.removeEventListener('pointermove',reveal);document.removeEventListener('pointerdown',reveal);document.removeEventListener('keydown',reveal);document.removeEventListener('focusin',reveal)};
 },[immersive]);
 return immersive&&hidden;
}
