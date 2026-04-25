import Link from "next/link";

export default function LiveFeed() {
  return (
    <div>
      <h1>Lakitu Live Feed</h1>
      <p>Select a parking lot to watch its occupancy in real-time.</p>
      {/* Placeholder mientras no hay forma de acceder a los parkings reales */}
      <ul>
        <li>
          <Link href="/liveFeed/lot1">Lot 1</Link>
        </li>
        <li>
          <Link href="/liveFeed/lot2">Lot 2</Link>
        </li>
        <li>
          <Link href="/liveFeed/lot3">Lot 3</Link>
        </li>
      </ul>
    </div>
  );
}
