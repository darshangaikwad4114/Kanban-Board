import gsap from 'gsap';
import { Flip } from 'gsap/Flip';

let registered = false;

export function registerGsapPlugins() {
  if (registered || typeof window === 'undefined') return;
  gsap.registerPlugin(Flip);
  registered = true;
}

export { gsap, Flip };
