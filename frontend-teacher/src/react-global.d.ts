import type { FormEvent as ReactFormEvent, ReactNode as ReactNodeType } from 'react';
declare global {
  namespace React {
    type ReactNode = ReactNodeType;
    type FormEvent<T = Element> = ReactFormEvent<T>;
  }
}
export {};
