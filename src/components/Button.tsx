import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type ButtonOwnProps = {
  /** "primary" (default): the one most important action in a view. "secondary": any other action. */
  kind?: "primary" | "secondary";
  /** The label: a verb or a short verb phrase, plain text. An arrow character is fine. */
  children: ReactNode;
  /** Go somewhere instead of doing something: renders a link that looks like a button. */
  href?: string;
  /** The element used when href is set. Default "a". Pass your router's link (Next.js Link works as is) for client-side navigation. */
  linkComponent?: ElementType;
  /** Unavailable. A button is disabled; a link keeps its role but loses its href and tab stop. Say why nearby: a disabled button cannot be the only explanation. */
  disabled?: boolean;
  /** The button's type when it is a button. Default "button", so it never submits a form by accident. */
  type?: "button" | "submit" | "reset";
  /** Where a link opens, as on an anchor. */
  target?: string;
  /** The link's rel, as on an anchor. */
  rel?: string;
  /** Force a state, for docs and stories. The real states come from hover, press and keyboard focus. */
  state?: "hover" | "pressed" | "focus";
  /** Extra class names, added after the component's own. */
  className?: string;
};

export type ButtonProps = ButtonOwnProps & Omit<ComponentPropsWithoutRef<"button">, keyof ButtonOwnProps>;

/**
 * The main way to act. Primary for the one most important action in a view, secondary for any other.
 * States change tone only: no offset, no shadow. A button that goes to another page is a link that
 * looks like a button; one that does something is a button. Both look the same.
 */
export function Button({ kind = "primary", children, href, linkComponent: LinkComponent = "a", disabled = false, type = "button", target, rel, state, className, ...rest }: ButtonProps) {
  const cls = ["ht-button", `ht-button--${kind}`, className ?? ""].filter(Boolean).join(" ");
  if (href !== undefined) {
    const linkRest = rest as unknown as ComponentPropsWithoutRef<"a">;
    if (disabled) {
      // Announced as a link, but not focusable and not followable.
      return (
        <a className={cls} role="link" aria-disabled="true" tabIndex={-1} data-ht-state={state} {...linkRest}>
          {children}
        </a>
      );
    }
    return (
      <LinkComponent className={cls} href={href} target={target} rel={rel} data-ht-state={state} {...linkRest}>
        {children}
      </LinkComponent>
    );
  }
  return (
    <button className={cls} type={type} disabled={disabled} aria-disabled={disabled || undefined} data-ht-state={state} {...rest}>
      {children}
    </button>
  );
}
