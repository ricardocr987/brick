//import { AiOutlineClose } from "react-icons/ai";
import Link from "next/link";
//import { FaTwitter, FaGithub } from "react-icons/fa";
import styles from "@/styles/components/Sidebar.module.css";

interface NavProps {
  NavItems: any;
  sidebar: boolean;
  showSidebar: any;
}

export const Sidebar = ({ NavItems, sidebar, showSidebar }: NavProps) => {
  return (
    <div
      onClick={showSidebar}
      className={
        sidebar ? styles.sidebar_container_active : styles.sidebar_container
      }
    >
      <div className={styles.close_icon}>
        {
          //<AiOutlineClose />
        }
      </div>
      <div className={styles.sidebar_wrapper}>
        {NavItems.map((route: any) => (
          <div className={styles.sidebar_menu} key={route.label}>
            <div onClick={showSidebar} className={styles.sidebar_links}>
              <Link href={`/${route.label}`}>
                {route.label}
              </Link>
            </div>
          </div>
        ))}
        <div className={styles.social_links}>
          <div className={styles.row}>
            <div className={styles.column}>
              <a href="https://twitter.com/ricardocr987">
                <i>
                  {
                    //<FaTwitter />
                  }
                </i>
              </a>
            </div>
            <div className={styles.column}>
              <a href="https://github.com/ricardocr987">
                <i>
                  {
                    //<FaGithub />
                  }
                </i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Sidebar;
