import { PatentsCard } from './Prestige';
import { Quantum } from './Quantum';
import { Computer } from './research/computer';
import { Tree } from './research/tree';

export function Research() {
  return (<div><Computer /><Quantum /><PatentsCard /><Tree /></div>);
}
