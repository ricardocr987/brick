import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import styles from "@/styles/components/Navbar.module.css";
import Link from 'next/link';
import dynamic from 'next/dynamic'
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

interface NavProps {
  NavItems: { label: string; url: string, key: number }[];
}

export const Navbar = ({ NavItems }: NavProps) => {
  const [sidebar, setSidebar] = useState(false);
  const showSidebar = () => setSidebar(!sidebar);

  const [navbar, setNavbar] = useState(false);
  useEffect(() => {
    window.addEventListener("scroll", changeBackground);
  });
  
  const changeBackground = () => {
    if (window.scrollY >= 80) {
      setNavbar(true);
    } else {
      setNavbar(false);
    }
  };

  return (
    <>
      <div className={styles.nav}>
        <div
          className={
            sidebar
              ? styles.hide : navbar
              ? styles.navbar_container_active : styles.navbar_container
          }
        >
          <div className={styles.navbar_logo}>
            <img
              src="logo.svg"
              height="50"
              width="100" />
          </div>

          <div className={styles.mobile_icon} onClick={showSidebar}>
            <img src="menu-burguer-icon.svg"/>
          </div>

          <div className={styles.nav_menu}>
            { NavItems.map(route => (
                <div className={styles.nav_item} key={route.label}>
                  <Link href={route.url} passHref>
                    <div className={styles.nav_links} key={route.key}>
                      {route.label}
                    </div>
                  </Link>
                </div>
            ))}
          </div>
          <div className={styles.connect_wallet}>
            <WalletMultiButtonDynamic />
          </div>
        </div>
      </div>
      <Sidebar
        NavItems={NavItems}
        sidebar={sidebar}
        showSidebar={showSidebar}
      />
    </>
  );
};

export default Navbar;
