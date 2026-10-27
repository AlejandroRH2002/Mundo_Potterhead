import type {ImgHTMLAttributes} from 'react';
import {safeImageSource} from '../lib/imageSource';
type Props=Omit<ImgHTMLAttributes<HTMLImageElement>,'src'|'srcSet'|'dangerouslySetInnerHTML'> & {src:unknown};
/** All API, form and persisted image references cross the same rendering boundary. */
export function SafeImage({src,...props}:Props){return <img {...props} src={safeImageSource(src)}/>;}
