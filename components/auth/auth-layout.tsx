import Image from "next/image";
import Link from "next/link";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f0fdf4] px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <Link href="/" className="mb-7 inline-flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#14532d] text-white">
            <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
              <path
                d="M12 20v-8m0 3c-4.5 0-7-2.5-7-7 4.5 0 7 2.5 7 7Zm0-3c0-4.5 2.5-7 7-7 0 4.5-2.5 7-7 7Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight text-[#102a43]">
            SoilMeter <span className="font-normal text-[#718074]">M1</span>
          </span>
        </Link>

        <div className="grid overflow-hidden rounded-[30px] border border-[#dceee0] bg-white shadow-[0_24px_70px_rgba(20,83,45,0.08)] lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="relative hidden min-h-[680px] overflow-hidden bg-[#14532d] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-24 -bottom-16 size-96 rounded-full border border-white/10" />
            <div className="absolute -right-12 -bottom-4 size-72 rounded-full border border-white/10" />
            <div className="relative z-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#bbf7d0]">
                Soil insights, made simple
              </p>
              <h2 className="mt-5 max-w-sm text-4xl leading-tight font-semibold tracking-[-0.04em]">
                Better growing starts with understanding.
              </h2>
              <p className="mt-4 max-w-sm leading-7 text-white/75">
                Keep your soil readings close and make thoughtful decisions for
                everything you grow.
              </p>
            </div>
            <div className="relative z-10 flex min-h-64 items-center justify-center">
              <Image
                src="/soil_sensor.png"
                alt="SoilMeter M1 soil sensor"
                width={345}
                height={550}
                priority
                className="h-64 w-auto drop-shadow-[0_18px_25px_rgba(0,0,0,0.24)]"
              />
            </div>
            <p className="relative z-10 text-xs text-white/55">
              SoilMeter M1 · A clearer view beneath the surface
            </p>
          </aside>
          <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
            {children}
          </section>
        </div>
        <p className="mt-6 text-center text-xs text-[#718074]">
          Secure access to your SoilMeter workspace
        </p>
      </div>
    </main>
  );
}
