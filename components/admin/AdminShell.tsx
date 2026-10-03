"use client";
import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminGuard from "./AdminGuard";
import styles from "./admin.module.css";

const navigation = [
  ["/admin", "대시보드", "Dashboard"],
  ["/admin/members", "회원", "Mitglieder"],
  ["/admin/community", "커뮤니티", "Community"],
  ["/admin/articles", "기사", "Artikel"],
  ["/admin/contact", "문의", "Kontakt"],
] as const;

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className={styles.shell}><AdminGuard>
    <header><p className={styles.eyebrow}>GERMAN HANGUK · ADMIN</p><h1>운영센터</h1><p>회원·커뮤니티·기사·문의 운영 / Betriebszentrale</p></header>
    <nav aria-label="관리자 메뉴" className={styles.nav}>{navigation.map(([href, ko, de]) =>
      <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><b>{ko}</b><small>{de}</small></Link>
    )}</nav>
    {children}
  </AdminGuard></div>;
}
