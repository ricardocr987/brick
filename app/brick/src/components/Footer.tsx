import styles from "@/styles/components/Footer.module.css";

export const Footer = () => {
  return (
    <div className={styles.color__section}>
      <div className={styles.row}>
        <div className={styles.column}>
          <a href="https://twitter.com/ricardocr987">
              <img
                src="/twitter-square.svg"
                height="50"
                width="100" />
          </a>
        </div>
        <div className={styles.column}>
          <a href="https://github.com/ricardocr987/brick">
              <img
                  src="/github-square.svg"
                  height="55"
                  width="100" />
          </a>
        </div>
      </div>
    </div>
  );
};
