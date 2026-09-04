import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ variant = 'primary', className = '', children, ...props }: PropsWithChildren<ButtonProps>) {
  return (
    <button className={`new-button new-button--${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
