import { SafeImage } from '@/shared/components/SafeImage';
import type { Product } from '@/types/product';
import { productPlaceholder } from '../../../../shared/productSchema';

interface Props {
  product: Product;
  models: NonNullable<Product['models']>;
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function DesignPicker({ product, models, selectedId, onSelect }: Props) {
  return (
    <fieldset className="design-selector">
      <legend>Elige tu diseño</legend>
      <div className="design-picker">
        {models.map(model => {
          const image = model.image || model.images?.[0];
          const thumbnail = model.thumbnail || (image ? product.imageThumbnails?.[image] ?? image : productPlaceholder);
          const unavailable = product.inventoryMode === 'enforce' && !!model.skus && !model.skus.some(sku => (sku.quantity ?? 0) > 0);
          return (
            <button
              type="button"
              className="design-choice"
              key={model.id}
              aria-label={'Elegir diseño ' + model.name}
              aria-pressed={selectedId === model.id}
              title={model.name + (unavailable ? ' · No disponible para seleccionar' : '')}
              disabled={unavailable}
              onClick={() => onSelect(model.id)}
            >
              <span className="design-choice-photo">
                <SafeImage src={thumbnail} alt="" width={160} height={160} loading="lazy" decoding="async" />
                {selectedId === model.id && <span className="design-choice-check" aria-hidden="true">✓</span>}
              </span>
              <span className="design-choice-name">{model.name}</span>
              {unavailable && <span className="design-choice-state">No disponible</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
