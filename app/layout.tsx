import type { Metadata } from 'next';
import 'mapbox-gl/dist/mapbox-gl.css';

export const metadata: Metadata = {
  title: 'Campus Map',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, height: '100vh', overflow: 'hidden' }}>{children}</body>
    </html>
  );
}
