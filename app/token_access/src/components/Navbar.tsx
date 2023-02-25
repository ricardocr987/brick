import { useState, useEffect } from "react";
//import { FaBars } from "react-icons/fa";
import Sidebar from "./Sidebar";
import styles from "@/styles/components/Navbar.module.css";
import Link from 'next/link';
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

interface NavProps {
  NavItems: { label: string; url: string, key: number, comingSoon?: boolean }[];
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
              ? styles.hide
              : navbar
              ? styles.navbar_container_active
              : styles.navbar_container
          }
        >
          <div className={styles.navbar_logo}>
            <img
              src="logo.svg"
              height="50"
              width="100" />
          </div>

          <div className={styles.mobile_icon}>
            {
              //<FaBars onClick={showSidebar} />
            }
          </div>

          <div className={styles.nav_menu}>
            {NavItems.map(route => {
              return  (
                <div className={styles.nav_item} key={route.label}>
                  <div className={styles.nav_links} key={route.key}>
                    <Link href={route.url} passHref>
                          {route.label}
                    </Link>
                  </div>
                </div>
              );
              })}
          </div>
          <div className={styles.connect_wallet}>
            <WalletMultiButton />
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
