import {useEffect,useState} from 'react';
import type {PromotionSettings} from '../../../../shared/promotions';
import {promotionService} from '../services/promotionService';
export function usePromotions(){
 const [settings,setSettings]=useState<PromotionSettings>();
 useEffect(()=>{let controller=new AbortController();const load=()=>{controller.abort();controller=new AbortController();const current=controller;void promotionService.public(current.signal).then(value=>{if(!current.signal.aborted)setSettings(value);}).catch(()=>{if(!current.signal.aborted)setSettings(undefined);});};load();window.addEventListener('focus',load);return()=>{controller.abort();window.removeEventListener('focus',load);};},[]);
 return settings;
}
