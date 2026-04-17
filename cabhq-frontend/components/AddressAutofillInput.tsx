'use client';

import dynamic from 'next/dynamic';
import type { SelectedAddress } from './AddressAutofillInputInner';

const AddressAutofillInputInner = dynamic(
  () => import('./AddressAutofillInputInner'),
  {
    ssr: false,
    loading: () => (
      <div>
        <div className="mb-2 h-5 w-24 rounded bg-white/5" />
        <div className="h-[50px] w-full rounded-xl border border-white/10 bg-[#0b1728]" />
      </div>
    ),
  },
);

type AddressAutofillInputProps = {
  label: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  onChangeValue: (value: string) => void;
  onSelectAddress: (address: SelectedAddress) => void;
};

export type { SelectedAddress };

export default function AddressAutofillInput(props: AddressAutofillInputProps) {
  return <AddressAutofillInputInner {...props} />;
}