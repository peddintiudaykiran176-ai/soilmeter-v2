import Image from "next/image";
import {
  FiArrowRight,
  FiCheck,
  FiDroplet,
  FiFeather,
  FiLayout,
  FiTrendingUp,
} from "react-icons/fi";
import { HomeAuthLink } from "@/components/auth/home-auth-link";

const features = [
  {
    number: "01",
    title: "Know your soil",
    description:
      "See soil moisture at a glance and understand what is happening beneath the surface.",
    icon: <FiDroplet className="size-6" aria-hidden="true" />,
  },
  {
    number: "02",
    title: "Spot changes early",
    description:
      "Follow readings over time so you can notice shifts and respond with confidence.",
    icon: <FiTrendingUp className="size-6" aria-hidden="true" />,
  },
  {
    number: "03",
    title: "Check in anywhere",
    description:
      "A clear, simple dashboard brings your sensor readings together in one place.",
    icon: <FiLayout className="size-6" aria-hidden="true" />,
  },
];

const readings = [
  { label: "Moisture", value: "42", unit: "%", change: "Within range" },
  { label: "Temperature", value: "21.8", unit: "°C", change: "Steady today" },
  { label: "Soil health", value: "Good", unit: "", change: "Looking balanced" },
];

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#f8f9f4] text-[#183b2c]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 sm:px-10 lg:px-12">
        <a href="#" className="flex items-center gap-2.5" aria-label="Soilmeter home">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#1f513b] text-white">
            <FiFeather className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">soilmeter</span>
        </a>

        <nav className="hidden items-center gap-9 text-sm font-medium text-[#52675a] md:flex">
          <a className="transition-colors hover:text-[#183b2c]" href="#features">
            Features
          </a>
          <a className="transition-colors hover:text-[#183b2c]" href="#dashboard">
            Dashboard
          </a>
          <a className="transition-colors hover:text-[#183b2c]" href="#about">
            About
          </a>
        </nav>

        <HomeAuthLink />
      </header>

      <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-6 pb-20 pt-10 sm:px-10 sm:pb-28 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12 lg:pb-32 lg:pt-16">
        <div className="relative z-10">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dce7d7] bg-white/70 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#477454]">
            <span className="size-2 rounded-full bg-[#76a96c]" />
            Better growing starts below
          </p>
          <h1 className="max-w-2xl text-5xl leading-[1.06] font-semibold tracking-[-0.055em] text-[#183b2c] sm:text-6xl lg:text-7xl">
            Get to know your soil.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#64756a]">
            A little more insight goes a long way. Soilmeter helps you keep an
            eye on soil conditions and make thoughtful decisions for your plants.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-[#1f513b] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#163e2d]"
            >
              See how it works
              <FiArrowRight className="size-4" aria-hidden="true" />
            </a>
            <span className="text-sm text-[#738176]">Simple readings. Smarter care.</span>
          </div>
          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-[#e1e8dc] pt-6 text-sm text-[#52675a]">
            <span className="flex items-center gap-2">
              <FiCheck className="size-4 text-[#65935c]" aria-hidden="true" /> Clear soil insights
            </span>
            <span className="flex items-center gap-2">
              <FiCheck className="size-4 text-[#65935c]" aria-hidden="true" /> Made for everyday growing
            </span>
          </div>
        </div>

        <div className="relative mx-auto flex min-h-[390px] w-full max-w-[530px] items-center justify-center sm:min-h-[490px]">
          <div className="absolute inset-x-5 top-6 bottom-4 rounded-[44%] bg-[#e7efdc]" />
          <div className="absolute right-8 top-12 size-20 rounded-full border border-[#d3e2ca] sm:right-14 sm:top-16" />
          <div className="absolute bottom-8 left-2 size-12 rounded-full bg-[#d7e6cc] sm:bottom-14 sm:left-8" />
          <div className="absolute inset-x-0 bottom-5 h-24 rounded-[50%] bg-[#dce8d1]/70 blur-2xl" />
          <Image
            src="/soil_sensor.png"
            alt="Soilmeter soil sensor with two measurement probes"
            width={345}
            height={550}
            priority
            className="relative z-10 h-[355px] w-auto drop-shadow-[0_22px_20px_rgba(27,54,38,0.16)] sm:h-[445px]"
          />
          <div className="absolute bottom-10 left-0 z-20 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-[0_12px_35px_rgba(27,54,38,0.1)] backdrop-blur sm:bottom-14 sm:left-1">
            <p className="text-xs font-medium text-[#718074]">A closer look</p>
            <p className="mt-1 text-sm font-semibold text-[#244b35]">Under the surface</p>
          </div>
          <div className="absolute right-0 top-16 z-20 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-[0_12px_35px_rgba(27,54,38,0.1)] backdrop-blur sm:right-1 sm:top-24">
            <p className="text-xs font-medium text-[#718074]">Designed for</p>
            <p className="mt-1 text-sm font-semibold text-[#244b35]">Everyday growing</p>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-20 sm:py-24">
        <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6e9864]">
              A clearer picture
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#183b2c] sm:text-4xl">
              Good growing begins with good information.
            </h2>
            <p className="mt-4 leading-7 text-[#718074]">
              Get the essentials without the guesswork, in a format that feels
              easy to come back to.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="rounded-3xl border border-[#e8ede4] bg-[#fbfcf9] p-7 transition-transform hover:-translate-y-1 sm:p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[#eaf1e4] text-[#42714b]">
                    <span className="size-6">{feature.icon}</span>
                  </span>
                  <span className="text-xs font-semibold tracking-[0.14em] text-[#9baa9c]">
                    {feature.number}
                  </span>
                </div>
                <h3 className="mt-7 text-xl font-semibold tracking-tight text-[#244b35]">
                  {feature.title}
                </h3>
                <p className="mt-3 leading-7 text-[#718074]">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="dashboard" className="bg-[#f0f4eb] px-6 py-20 sm:px-10 sm:py-24 lg:px-12">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6e9864]">
              Your soil, in view
            </p>
            <h2 className="mt-4 max-w-lg text-3xl leading-tight font-semibold tracking-[-0.04em] text-[#183b2c] sm:text-4xl">
              A simple dashboard for what matters.
            </h2>
            <p className="mt-5 max-w-lg leading-7 text-[#64756a]">
              Bring your soil readings together in one calm, easy-to-read
              interface. Check a snapshot or take a closer look at recent trends.
            </p>
            <a
              href="#features"
              className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#28583c] hover:text-[#163e2d]"
            >
              Discover the features
              <FiArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>

          <div className="rounded-[28px] border border-[#e1e9dc] bg-white p-5 shadow-[0_24px_70px_rgba(31,67,44,0.08)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf1ea] pb-5">
              <div>
                <p className="text-sm font-semibold text-[#244b35]">Garden overview</p>
                <p className="mt-1 text-xs text-[#8a988d]">Sample dashboard</p>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-[#eef5e9] px-3 py-1.5 text-xs font-medium text-[#57804f]">
                <span className="size-1.5 rounded-full bg-[#7cab65]" />
                Sensor connected
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {readings.map((reading) => (
                <div key={reading.label} className="rounded-2xl bg-[#f8faf6] p-4">
                  <p className="text-xs font-medium text-[#819084]">{reading.label}</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-[#244b35]">
                    {reading.value}
                    <span className="ml-1 text-sm font-medium text-[#718074]">
                      {reading.unit}
                    </span>
                  </p>
                  <p className="mt-2 text-[11px] text-[#789071]">{reading.change}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-[#edf1ea] p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#244b35]">Moisture trend</p>
                  <p className="mt-1 text-xs text-[#8a988d]">Sample readings over time</p>
                </div>
                <span className="rounded-lg bg-[#f2f6ee] px-2.5 py-1.5 text-xs font-medium text-[#6f866a]">
                  7 days
                </span>
              </div>
              <div className="mt-6 flex h-28 items-end justify-between gap-2 border-b border-[#edf1ea] px-1">
                {[42, 58, 49, 72, 63, 81, 69, 92, 75, 84, 66, 78].map((height, index) => (
                  <div
                    key={index}
                    className={`w-full rounded-t-md ${index === 7 ? "bg-[#4e8654]" : "bg-[#dce9d5]"}`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-[#9aa69c]">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
                <span>Sun</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer id="about" className="bg-[#183b2c] text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-9 sm:px-10 md:flex-row md:items-center md:justify-between lg:px-12">
          <a href="#" className="flex items-center gap-2.5" aria-label="Soilmeter home">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-white">
              <FiFeather className="size-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold tracking-tight">soilmeter</span>
          </a>
          <p className="text-sm text-white/65">
            A little more insight for the things you grow.
          </p>
          <p className="text-xs text-white/45">© Soilmeter</p>
        </div>
      </footer>
    </main>
  );
}
