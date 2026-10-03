'use client';
import {useEffect,useRef} from 'react';

type PlaybackActions={toggle:()=>void;previous:()=>void;next:()=>void};
const editableSelector='input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="slider"]';
const interactiveSelector='button,a[href],summary,[role="button"],[role="menuitem"],[role="checkbox"],[role="switch"]';

export function usePlaybackShortcuts(actions:PlaybackActions){
 const latestActions=useRef(actions);
 useEffect(()=>{latestActions.current=actions},[actions]);
 useEffect(()=>{
  function handleKeydown(event:KeyboardEvent){
   if(event.defaultPrevented||event.repeat||event.isComposing||event.keyCode===229||event.altKey||event.metaKey)return;
   const target=event.target instanceof Element?event.target:document.activeElement;
   if(target?.closest(editableSelector))return;
   if(Array.from(document.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"]')).some(dialog=>dialog.getClientRects().length>0))return;
   const isSpace=event.code==='Space'||event.key===' ';
   const combination=event.ctrlKey&&event.shiftKey;
   let action:(()=>void)|undefined;
   if(isSpace&&(combination||(!event.ctrlKey&&!event.shiftKey&&!target?.closest(interactiveSelector))))action=latestActions.current.toggle;
   else if(combination&&event.key==='ArrowLeft')action=latestActions.current.previous;
   else if(combination&&event.key==='ArrowRight')action=latestActions.current.next;
   if(!action)return;
   event.preventDefault();
   action();
  }
  document.addEventListener('keydown',handleKeydown);
  return()=>document.removeEventListener('keydown',handleKeydown);
 },[]);
}

export function PlaybackShortcutHelp(){
 return <section className="settings-block"><h3>播放快捷键</h3><p>网页处于当前窗口时可使用；输入文字或打开弹窗时暂停响应。</p><dl className="playback-shortcut-list"><div><dt>播放 / 暂停</dt><dd><kbd>空格</kbd><span>或</span><kbd>Ctrl + Shift + 空格</kbd></dd></div><div><dt>上一首</dt><dd><kbd>Ctrl + Shift + ←</kbd></dd></div><div><dt>下一首</dt><dd><kbd>Ctrl + Shift + →</kbd></dd></div></dl></section>;
}
