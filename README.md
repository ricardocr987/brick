Brick is a protocol that allows sellers to tokenize goods, services, or assets by setting up a configuration. Here's how it works:

1. Set the token you want to receive in the sale.
2. Choose between an unlimited or limited sale. In the case of a limited sale, define how many sales you want to make.
3. Set the time period during which the buyer can get a refund (it can be set to 0). If the buyer burns the token, they won't be able to access the funds, and the seller will have to wait for the set time to withdraw the funds.

As the seller, you will be responsible for giving the buyer access to the good, service, or asset. This is done by calling the "use_asset" instruction, in which the token purchased by the buyer is burned, giving them access to whatever the seller has listed. To facilitate this process, I am building an indexer so that any app that uses Brick in the background can easily access information about different events and accounts.

# Diagram to understand the logic of the Solana program:![Screenshot 2023-03-01 at 22 40 32](https://user-images.githubusercontent.com/32191898/222271446-954f59f2-c715-4813-822b-9028fdfbacc7.png)
