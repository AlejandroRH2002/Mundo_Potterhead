import { useState } from 'react';
import { useProducts } from '@/features/catalog/hooks/useProducts';
import { marketingService } from '../services/marketingService';
import { errorMessage } from '@/shared/lib/money';
export function useDiscount() {
  const { products } = useProducts();
  return marketingService.discount(products);
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
