import { useEffect, useState } from 'react';
import { productService } from '@/features/catalog/services/productService';
import { parseCatalogQuery } from '../../../../shared/catalogQuery.ts';
import { marketingService } from '../services/marketingService';
import { errorMessage } from '@/shared/lib/money';
export function useDiscount() {
  const [discount, setDiscount] = useState(0);
  const [revision, setRevision] = useState(0);
  useEffect(() => productService.subscribe(() => setRevision(value => value + 1)), []);
  useEffect(() => {
    const controller = new AbortController();
    const query = parseCatalogQuery(new URLSearchParams({ onSale: 'true', sort: 'descuento', pageSize: '1' }));
    void productService.search(query, controller.signal).then(page => {
      if (!controller.signal.aborted) setDiscount(marketingService.discount(page.items));
    }).catch(() => { if (!controller.signal.aborted) setDiscount(0); });
    return () => controller.abort();
  }, [revision]);
  return discount;
}
export function useSubscription() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');
  const subscribe = () => {
    try { setMessage(marketingService.subscribe(email, consent)); }
    catch (cause: unknown) { setMessage(errorMessage(cause)); }
  };
  return { email, setEmail, consent, setConsent, message, subscribe };
}
