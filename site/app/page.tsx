import { Render } from "./render";
import { homePage } from "@/lib/pages";

export default function Home() {
  return <Render page={homePage()} />;
}
