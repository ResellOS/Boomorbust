/** Shared BOB logo for all loading screens — screen blend removes black bg, subtle text glow only. */
export default function LoaderLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Boom or Bust"
      width={320}
      height={320}
      className="block h-auto w-[320px] bg-transparent"
      style={{
        mixBlendMode: 'screen',
        filter:
          'drop-shadow(0 0 20px rgba(54,231,161,0.25)) drop-shadow(0 0 40px rgba(167,139,250,0.15))',
      }}
      draggable={false}
    />
  );
}
