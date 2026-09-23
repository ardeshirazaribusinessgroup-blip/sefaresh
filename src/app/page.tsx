"use client";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CircleCheck,
  ClipboardCheck,
  MapPin,
  Sparkles,
} from "lucide-react";
import { ActionLink, Logo, ProductIcon } from "@/components/ui";
export default function Landing() {
  return (
    <div className="public-page">
      <header className="public-nav">
        <Logo />
        <nav>
          <a href="#how">سفارش چطور کار می‌کند؟</a>
          <a href="#benefits">برای تیم شما</a>
          <a href="#start">شروع در کرمان</a>
        </nav>
        <div className="public-actions">
          <Link href="/login">ورود به حساب</Link>
          <ActionLink href="/register">
            ساخت حساب کسب‌وکار
            <ArrowLeft size={16} />
          </ActionLink>
        </div>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-copy">
            <span className="eyebrow">
              <i />
              دستیار خرید کافه‌ها و رستوران‌ها
            </span>
            <h1>
              خرید مواد اولیه
              <br />
              <span>آسان شد.</span>
            </h1>
            <p>
              نیازهای تیم را یک‌جا ثبت کنید، شرایط تأمین را کنار هم ببینید و مسیر
              خرید را تا تحویل پیگیری کنید.
            </p>
            <ol className="landing-flow" aria-label="مسیر خرید با سفارش">
              <li><span>۱</span> ثبت نیاز</li>
              <li><span>۲</span> مقایسه تأمین</li>
              <li><span>۳</span> پیگیری خرید</li>
            </ol>
            <div className="public-actions">
              <ActionLink href="/register">
                ساخت حساب کسب‌وکار
                <ArrowLeft size={17} />
              </ActionLink>
              <ActionLink href="#how" secondary>
                ببینید چطور کار می‌کند
              </ActionLink>
            </div>
            <div className="landing-caption">
              <MapPin size={15} />
              محدوده آغاز فعالیت: کرمان
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-visual-top">
              <span>از نیاز تا خرید، یک مسیر روشن</span>
              <ClipboardCheck size={22} />
            </div>
            <div className="hero-list">
              <h3>سبد خرید کافه شما</h3>
              {[
                ["دانه قهوه", "۲ کیلوگرم"],
                ["شیر پرچرب", "۱۲ لیتر"],
                ["سیروپ وانیل", "۲ بطری"],
              ].map(([name, qty], i) => (
                <div className="hero-item" key={name}>
                  <ProductIcon index={i} />
                  <strong>{name}</strong>
                  <span>{qty}</span>
                </div>
              ))}
              <div className="hero-note">
                <Sparkles size={18} />
                قیمت کالا، هزینه ارسال و زمان تحویل را کنار هم ببینید.
              </div>
            </div>
            <p className="landing-caption">
              <CircleCheck size={15} />
              نمونه نمایشی · تصمیم نهایی خرید با شماست.
            </p>
          </div>
        </section>
        <div className="landing-tint">
          <section className="landing-section" id="how">
            <div className="how-intro">
              <div>
                <span className="how-kicker">مسیر خرید در سه گام</span>
                <h2>از نیاز تیم تا پیگیری خرید</h2>
                <p>
                  سفارش ثبت نیاز، مقایسه گزینه‌های تأمین و پیگیری خرید را در یک
                  مسیر روشن کنار هم می‌گذارد.
                </p>
              </div>
              <figure className="how-mascot">
                <Image
                  src="/rosha.png"
                  alt="روشا، همراه راهنمای خرید سفارش"
                  width={172}
                  height={172}
                  sizes="(max-width: 760px) 108px, 172px"
                />
              </figure>
            </div>
            <div className="how-grid">
              {[
                [
                  "۰۱",
                  "ثبت نیاز",
                  "کارکنان کالا، مقدار و واحد را ثبت می‌کنند. مسئول خرید درخواست‌ها را در یک فهرست بررسی می‌کند.",
                ],
                [
                  "۰۲",
                  "مقایسه تأمین",
                  "قیمت ثبت‌شده، هزینه ارسال، حداقل خرید و زمان تحویل را کنار هم ببینید و آگاهانه انتخاب کنید.",
                ],
                [
                  "۰۳",
                  "پیگیری خرید",
                  "پس از بازبینی، سفارش را ثبت کنید و وضعیت و سابقه آن را تا تحویل دنبال کنید.",
                ],
              ].map(([n, title, text]) => (
                <article className="how-card" key={n}>
                  <span>{n}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
        <section className="landing-section" id="benefits">
          <h2>یک فضای مشترک برای همه تیم</h2>
          <p>هرکس کار خودش را انجام می‌دهد؛ همه از وضعیت خرید خبر دارند.</p>
          <div className="benefits">
            <article className="benefit-card">
              <h3>برای مدیر و مسئول خرید</h3>
              <ul>
                {[
                  "درخواست‌های تیم را یک‌جا بررسی کنید.",
                  "هزینه نهایی را پیش از تأیید ببینید.",
                  "سابقه خرید و وضعیت سفارش‌ها را دنبال کنید.",
                ].map((t) => (
                  <li key={t}>
                    <Check size={17} />
                    {t}
                  </li>
                ))}
              </ul>
            </article>
            <article className="benefit-card">
              <h3>برای کارکنان و باریستاها</h3>
              <ul>
                {[
                  "نیازهای شیفت را سریع ثبت کنید.",
                  "مقدار، واحد و فوریت را روشن کنید.",
                  "نتیجه بررسی درخواست را همین‌جا ببینید.",
                ].map((t) => (
                  <li key={t}>
                    <Check size={17} />
                    {t}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>
        <section className="landing-section" id="start">
          <div className="landing-cta">
            <div>
              <h2>از یک خرید مشخص شروع کنید.</h2>
              <p>نیازهای این هفته را ثبت کنید و مسیر سفارش را تجربه کنید.</p>
            </div>
            <ActionLink href="/register">
              ساخت حساب کسب‌وکار
              <ArrowLeft size={17} />
            </ActionLink>
          </div>
        </section>
      </main>
      <footer className="public-footer">
        <Logo small />
        <span>دستیار خرید مواد اولیه کافه و رستوران · کرمان</span>
        <Link href="/login">ورود</Link>
      </footer>
    </div>
  );
}
