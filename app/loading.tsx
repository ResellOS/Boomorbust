import WarRoomLoader from '@/components/WarRoomLoader';

/** Route-transition loading UI — indeterminate shimmer (no real progress %). */
export default function Loading() {
  return <WarRoomLoader status="LOADING THE WAR ROOM..." />;
}
