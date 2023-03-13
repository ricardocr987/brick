import styles from '@/styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.home}>
      <h1 className={styles.home_title}>Brick protocol</h1>
      <h1 className={styles.home_subtitle}>
        Brick is a payment protocol that allows sellers to tokenize goods, services or assets by setting up a configuration:
      </h1>
      <h1 className={styles.home_subtitle}>
        - Set the price of the token.
      </h1>
      <h1 className={styles.home_subtitle}>
        - Set the token you want to receive in the sale.
      </h1>
      <h1 className={styles.home_subtitle}>
        - Choose between an unlimited or limited sale.
      </h1>
      <h1 className={styles.home_subtitle}>
        - Set the time period during which the buyer can get a refund.
      </h1>
      <h1 className={styles.home_subtitle}>
        - As an app creator you have the option to set fees to the permissionless market you are creating.
      </h1>
      <h1 className={styles.home_title}>Uses cases:</h1>
      <h1 className={styles.home_subtitle}>
        - SaaS monetization
      </h1>
      <h1 className={styles.home_subtitle}>
        - Token gating
      </h1>
      <h1 className={styles.home_subtitle}>
        - Inventory management
      </h1>
      <img className={styles.img} src="/intro.png"/>
    </div>
  )
}
