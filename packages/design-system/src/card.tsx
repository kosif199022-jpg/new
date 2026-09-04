import type { HTMLAttributes, PropsWithChildren, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  heading?: ReactNode;
  eyebrow?: ReactNode;
}

export function Card({ heading, eyebrow, className = '', children, ...props }: PropsWithChildren<CardProps>) {
  return (
    <section className={`new-card ${className}`.trim()} {...props}>
      {eyebrow ? <div className="new-card__eyebrow">{eyebrow}</div> : null}
      {heading ? <h2 className="new-card__title">{heading}</h2> : null}
      <div className="new-card__body">{children}</div>
    </section>
  );
}
