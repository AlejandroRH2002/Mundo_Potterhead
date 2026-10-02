import { Link } from 'react-router-dom';
export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
 return <nav aria-label="Migas de pan" className="breadcrumbs"><ol>{items.map((item,index)=><li key={`${item.label}-${index}`}>{index>0 && <span aria-hidden="true">/</span>}{item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>;
}
