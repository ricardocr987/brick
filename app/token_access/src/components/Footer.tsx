//import { FaTwitter, FaGithub } from "react-icons/fa";
import styles from "@/styles/components/Footer.module.css";

export const Footer = () => {
  return (
    <div className={styles.color__section}>
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
  );
};
