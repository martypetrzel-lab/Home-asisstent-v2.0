import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-chart">
      <h1>Stránka nebyla nalezena</h1>
      <Link href="/">Zpět na přehled</Link>
    </div>
  );
}
