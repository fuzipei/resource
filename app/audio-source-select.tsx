'use client';
import {useState} from 'react';
import {Select} from '@base-ui/react/select';
import {Check,ChevronUp} from 'lucide-react';
import type {Quality} from './music-types';

export function AudioSourceSelect({qualities,value,onChange}:{qualities:Quality[];value:string;onChange:(id:string)=>void}){
 const [open,setOpen]=useState(false);
 return <div className="quality-dropdown" data-open={open}>
  <Select.Root items={qualities.map(q=>({value:q.id,label:q.label}))} value={value||null} disabled={!qualities.length} open={open} onOpenChange={setOpen} modal={false} onValueChange={id=>{if(typeof id==='string')onChange(id)}}>
   <Select.Trigger className="audio-source-trigger" aria-label="音源" title="选择音源"><Select.Value placeholder="音源"/><Select.Icon><ChevronUp size={12} aria-hidden="true"/></Select.Icon></Select.Trigger>
   <Select.Portal>
    <Select.Positioner className="audio-source-positioner" side="top" align="end" sideOffset={8} alignItemWithTrigger={false} positionMethod="fixed" collisionPadding={8} collisionAvoidance={{side:'none',align:'shift',fallbackAxisSide:'none'}}>
     <Select.Popup className="audio-source-popup" aria-label="可用音源"><Select.List className="audio-source-list">
      {qualities.map(q=><Select.Item className="audio-source-option" key={q.id} value={q.id}><Select.ItemText>{q.label}</Select.ItemText><Select.ItemIndicator><Check size={14} aria-hidden="true"/></Select.ItemIndicator></Select.Item>)}
     </Select.List></Select.Popup>
    </Select.Positioner>
   </Select.Portal>
  </Select.Root>
 </div>;
}
