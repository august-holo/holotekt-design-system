// Renders a Page (lib/pages.ts) as HTML. Every colour, type style, space, radius and border comes
// from the published CSS variables and text-style classes; the module stylesheet holds only
// var(--ht-…) values, proportions and layout.
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Block, Cell, Page, Part } from "@/lib/pages";
import { Live } from "./live";
import styles from "./render.module.css";

// Storybook is a separate static app under /storybook/: a plain link, not a Next route.
const A = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
  href.startsWith("/") && !href.startsWith("/storybook") ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} className={className}>
      {children}
    </a>
  );

function Parts({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((p, i) =>
        "token" in p ? (
          <span key={i} className={styles.role}>
            {p.label ?? p.token}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function CellView({ cell }: { cell: Cell }) {
  if (typeof cell === "string") return <>{cell}</>;
  if ("parts" in cell) return <Parts parts={cell.parts} />;
  if ("bar" in cell) return <span className={styles.bar} style={{ width: `var(${cell.bar})` }} aria-label={cell.label} />;
  // A swatch with no text is a filled square on its own, as in the surface ladder.
  if (cell.swatch && !cell.text) return <span aria-hidden="true" className={styles.swatchLarge} style={{ background: cell.swatch, ...cell.style }} />;
  return (
    <span className={[cell.className, cell.muted ? styles.muted : ""].filter(Boolean).join(" ") || undefined} style={cell.style}>
      {cell.swatch && <span aria-hidden="true" className={styles.swatch} style={{ background: cell.swatch }} />}
      {cell.code ? <code>{cell.text}</code> : cell.text}
    </span>
  );
}

function Table({ block }: { block: Extract<Block, { kind: "table" }> }) {
  const cls = [styles.table, block.headless ? styles.headless : "", block.strongRule ? styles.strongRule : "", block.reference ? styles.reference : ""].filter(Boolean).join(" ");
  return (
    <div className={block.reference ? styles.scroll : undefined}>
      <table className={cls}>
        {block.widths && (
          <colgroup>
            {block.widths.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
        )}
        <thead className={block.headless ? styles.srOnly : undefined}>
          <tr>
            {block.columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>
                  <CellView cell={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Rows({ block }: { block: Extract<Block, { kind: "rows" }> }) {
  const flex = (i: number) => ({ flex: `${block.cells[i]?.grow ?? 1} 1 ${block.cells[i]?.basis ?? "auto"}` });
  return (
    <div role="table" className={[styles.rows, block.strongRule ? styles.strongRule : ""].filter(Boolean).join(" ")}>
      <div role="row" className={block.headless ? styles.srOnly : styles.rowsHead}>
        {block.columns.map((c, i) => (
          <div role="columnheader" key={c} style={flex(i)}>
            {c}
          </div>
        ))}
      </div>
      {block.rows.map((r, i) => (
        <div role="row" key={i} className={styles.rowsRow}>
          {r.map((c, j) => (
            <div role="cell" key={j} style={flex(j)} className={j === 0 ? styles.rowsFirst : undefined}>
              <CellView cell={c} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** "Raised card|Sits on the page…" → lines; the first line of a menu or card is its heading. */
const lines = (text?: string) => (text ? text.split("|") : []);
/** "ht-ui-label chip" → the global class as is, the module class hashed. */
const cls = (names?: string) => (names ? names.split(/\s+/).map((n) => styles[n] ?? n).join(" ") : undefined);

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "p":
      return <p className={block.muted ? styles.muted : undefined}>{block.text}</p>;
    case "eyebrow":
      return <p className={`ht-ui-label ${styles.muted}`}>{block.text}</p>;
    case "h2":
      return <h2>{block.text}</h2>;
    case "h3":
      return <h3>{block.text}</h3>;
    case "list":
      return (
        <ul>
          {block.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      );
    case "links":
      return (
        <ul className={block.big ? styles.bigLinks : styles.links}>
          {block.items.map((l) => (
            <li key={l.href + l.text}>
              <A href={l.href} className={block.big ? "ht-heading-3" : undefined}>
                {l.text}
              </A>
              {l.note && <span className={styles.muted}> — {l.note}</span>}
            </li>
          ))}
        </ul>
      );
    case "table":
      return <Table block={block} />;
    case "rows":
      return <Rows block={block} />;
    case "ramp":
      return (
        <div className={styles.rampRow}>
          <span className={`ht-ui-small ${styles.secondary}`}>{block.name}</span>
          <ol className={styles.ramp} aria-label={`${block.name}, ${block.steps.length} steps from light to dark`}>
            {block.steps.map((s) => (
              <li key={s.path} title={`${s.path} ${s.value}`} style={{ background: s.value }} />
            ))}
          </ol>
        </div>
      );
    case "specimen":
      return (
        <p className={block.className} style={block.style} aria-label={block.label}>
          {block.text}
        </p>
      );
    case "sample": {
      const caption = lines(block.label);
      return (
        <figure className={styles.figure}>
          <div style={block.style} className={[styles.sample, cls(block.className)].filter(Boolean).join(" ")}>
            {block.text}
            {block.inner?.map((inner, i) => {
              const ls = lines(inner.text);
              return (
                <div key={i} style={inner.style} className={cls(inner.className)}>
                  {ls.length > 1 ? ls.map((l, j) => <div key={j} className={j === 0 ? styles.innerHead : styles.innerLine}>{l}</div>) : inner.text}
                </div>
              );
            })}
          </div>
          {caption.length > 0 && (
            <figcaption>
              <span className="ht-ui-small">{caption[0]}</span>
              {caption[1] && <span className={`ht-ui-meta ${styles.muted}`}>{caption[1]}</span>}
            </figcaption>
          )}
        </figure>
      );
    }
    case "row":
      return (
        <div className={styles.row}>
          {block.items.map((b, i) => (
            <BlockView key={i} block={b} />
          ))}
        </div>
      );
    case "tiles":
      return (
        <div className={styles.tiles}>
          {block.items.map((t, i) => (
            <div key={i} className={styles.tile}>
              <span className={`ht-ui-label ${styles.muted}`}>{t}</span>
            </div>
          ))}
        </div>
      );
    case "index":
      return (
        <ul className={styles.index}>
          {block.rows.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className={styles.indexLink}>
                <span className={styles.indexText}>
                  <span className="ht-heading-3">{r.title}</span>
                  <span className={`ht-ui-body ${styles.secondary}`}>{r.line}</span>
                </span>
                <span className={`ht-heading-3 ${styles.arrow}`} aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      );
    case "details":
      return (
        <details id={block.id} className={styles.details}>
          <summary className="ht-heading-4">{block.summary} →</summary>
          <div className={styles.detailsBody}>
            {block.blocks.map((b, i) => (
              <BlockView key={i} block={b} />
            ))}
          </div>
        </details>
      );
    case "pager":
      return (
        <nav className={`ht-ui-small ${styles.pager}`} aria-label="Previous and next foundation">
          <span>{block.prev && <Link href={block.prev.href}>{block.prev.text}</Link>}</span>
          <span>{block.next && <Link href={block.next.href}>{block.next.text}</Link>}</span>
        </nav>
      );
    case "live":
      return (
        <figure className={styles.figure}>
          <div className={styles.live}>
            <Live id={block.example} />
          </div>
          <figcaption>
            <span className="ht-ui-small">{block.label}</span>
          </figcaption>
        </figure>
      );
    case "md":
      return (
        <div className={styles.prose}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.markdown}</ReactMarkdown>
        </div>
      );
  }
}

export function Render({ page }: { page: Page }) {
  const foundation = page.template === "foundation";
  const component = page.template === "component";
  return (
    <article className={styles.article}>
      <header className={styles.titleBlock}>
        {foundation && <p className={`ht-ui-label ${styles.muted}`}>Foundations / {page.title}</p>}
        {component && <p className={`ht-ui-label ${styles.muted}`}>Components / {page.title}</p>}
        <h1>{page.title}</h1>
        {!foundation && page.template !== "bare" && <p className={`ht-reading-lede ${styles.secondary} ${styles.lede}`}>{page.description}</p>}
      </header>
      {page.blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </article>
  );
}
