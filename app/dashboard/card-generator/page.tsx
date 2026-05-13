import type { Metadata } from 'next';
import CardGenerator from '@/components/card-generator/CardGenerator';

export const metadata: Metadata = {
  title: 'Card Generator — Boom or Bust',
  description: 'Generate shareable dynasty prediction cards for any NFL player.',
};

export default function CardGeneratorPage() {
  return <CardGenerator />;
}
