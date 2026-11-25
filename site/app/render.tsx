// Renders a Page (lib/pages.ts) as HTML. Deliberately unstyled: semantic elements only, until the
// system has tokens to style itself with. The swatch and ramp strip are the only visuals, and their
// colours are data; their sizes live in render.module.css.
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Block, Cell, Page } from "@/lib/pages";
import styles from "./render.module.css";

function CellView({ cell }: { cell: Cell }) {
  if (typeof cell === "string") return <>{cell}</>;
  return (
    <>
      {cell.swatch && (
        <span aria-hidden="true" className={styles.swatch} style={{ background: cell.swatch }} />
      )}
      {cell.code ? <code>{cell.text}</code> : cell.text}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "p":
      return <p>{block.text}</p>;
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
        <ul>
          {block.items.map((l) => (
            <li key={l.href}>
              {l.href.startsWith("/") ? <Link href={l.href}>{l.text}</Link> : <a href={l.href}>{l.text}</a>}
              {l.note && <> — {l.note}</>}
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <table>
          <thead>
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
      );
    case "ramp":
      // The one place the page draws: an ordered strip of a hue's steps, light to dark. Sizes and
      // colours are the token data; there is no decoration.
      return (
        <figure>
          <figcaption>
            {block.name}, {block.steps.length} steps from light to dark
          </figcaption>
          <ol className={styles.ramp}>
            {block.steps.map((s) => (
              <li key={s.path} className={styles.rampStep}>
                <span aria-hidden="true" className={styles.rampSwatch} style={{ background: s.value }} />
                <small>
                  {s.step}
                  <br />
                  <code>{s.value}</code>
                </small>
              </li>
            ))}
          </ol>
        </figure>
      );
    case "md":
      return <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.markdown}</ReactMarkdown>;
  }
}

export function Render({ page }: { page: Page }) {
  return (
    <article>
      <h1>{page.title}</h1>
      <p>{page.description}</p>
      {page.blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </article>
  );
}
